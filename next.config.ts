import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "frame-src https://readyplayer.me https://*.readyplayer.me;",
            ].join(" "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
