/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // jose includes JWE compression helpers (CompressionStream/DecompressionStream)
    // that trigger a false Edge Runtime warning, but we only use HMAC signing
    // (SignJWT/jwtVerify) which runs fine in the Edge Runtime.
    // This suppresses the spurious warning.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /jose\/dist\/webapi\/lib\/deflate/ },
    ]
    return config
  },
}

export default nextConfig
