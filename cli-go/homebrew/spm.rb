class Spm < Formula
  desc "Skills Package Manager for AI agents"
  homepage "https://skillpkg.dev"
  version "{{.Version}}"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/skillpkg/spm/releases/download/v{{.Version}}/spm_{{.Version}}_darwin_arm64.tar.gz"
      sha256 "{{.ChecksumDarwinArm64}}"
    else
      url "https://github.com/skillpkg/spm/releases/download/v{{.Version}}/spm_{{.Version}}_darwin_amd64.tar.gz"
      sha256 "{{.ChecksumDarwinAmd64}}"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/skillpkg/spm/releases/download/v{{.Version}}/spm_{{.Version}}_linux_arm64.tar.gz"
      sha256 "{{.ChecksumLinuxArm64}}"
    else
      url "https://github.com/skillpkg/spm/releases/download/v{{.Version}}/spm_{{.Version}}_linux_amd64.tar.gz"
      sha256 "{{.ChecksumLinuxAmd64}}"
    end
  end

  def install
    bin.install "spm"
  end

  test do
    system "#{bin}/spm", "--version"
  end
end
