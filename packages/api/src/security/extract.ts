// ── Extract text content from .skl packages for security scanning ──
// .skl files are tar.gz archives. On Cloudflare Workers we use
// DecompressionStream (Web API) for gzip and a minimal tar header parser.

interface TextFile {
  name: string;
  content: string;
}

/**
 * Check if a filename should be scanned for security patterns.
 * We scan markdown, text, yaml, json, and common config files.
 */
const isScannable = (name: string): boolean => {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.md') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.json') ||
    lower.endsWith('.toml') ||
    lower === 'skill.md' ||
    lower === 'readme.md'
  );
};

/**
 * Parse a tar archive from an ArrayBuffer.
 * Tar files consist of 512-byte header blocks followed by file content.
 */
const parseTar = (buffer: ArrayBuffer): TextFile[] => {
  const files: TextFile[] = [];
  const view = new Uint8Array(buffer);
  let offset = 0;

  while (offset + 512 <= view.length) {
    // Read the header block
    const header = view.slice(offset, offset + 512);

    // Check for end-of-archive (two zero blocks)
    if (header.every((b) => b === 0)) break;

    // Extract filename (bytes 0-99, null-terminated)
    const nameBytes = header.slice(0, 100);
    const nameEnd = nameBytes.indexOf(0);
    const rawName = new TextDecoder().decode(nameBytes.slice(0, nameEnd === -1 ? 100 : nameEnd));

    // Handle GNU long name extension (type 'L')
    const typeFlag = String.fromCharCode(header[156]);

    // Extract file size from octal (bytes 124-135)
    const sizeStr = new TextDecoder().decode(header.slice(124, 136)).replace(/\0/g, '').trim();
    const size = parseInt(sizeStr, 8) || 0;

    offset += 512; // Move past header

    if (typeFlag === 'L') {
      // GNU long filename: the next `size` bytes are the actual filename
      // followed by the real header. We skip this for simplicity and
      // use what we can from the next header.
      offset += Math.ceil(size / 512) * 512;
      continue;
    }

    if (size > 0 && offset + size <= view.length) {
      const content = view.slice(offset, offset + size);

      // Strip leading path prefix (e.g., "package/")
      const name = rawName.replace(/^[^/]+\//, '') || rawName;

      if (isScannable(name) && (typeFlag === '0' || typeFlag === '\0')) {
        const text = new TextDecoder().decode(content);
        files.push({ name, content: text });
      }
    }

    // Advance past file content (padded to 512-byte boundary)
    offset += Math.ceil(size / 512) * 512;
  }

  return files;
};

/**
 * Decompress a gzip buffer using the Web Streams DecompressionStream API.
 * Available in Cloudflare Workers runtime.
 */
const decompressGzip = async (compressed: ArrayBuffer): Promise<ArrayBuffer> => {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  // Write compressed data and close
  const writePromise = writer.write(new Uint8Array(compressed)).then(() => writer.close());

  // Read all decompressed chunks
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.byteLength;
  }

  await writePromise;

  // Concatenate chunks
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.byteLength;
  }

  return result.buffer;
};

/**
 * Extract text files from a .skl (tar.gz) package for security scanning.
 * Also accepts a manifest description to scan as a virtual file.
 */
export const extractTextFiles = async (
  packageData: ArrayBuffer,
  manifestDescription?: string,
): Promise<TextFile[]> => {
  const tarBuffer = await decompressGzip(packageData);
  const files = parseTar(tarBuffer);

  // Also scan the manifest description as a virtual file
  if (manifestDescription) {
    files.push({ name: 'manifest:description', content: manifestDescription });
  }

  return files;
};
