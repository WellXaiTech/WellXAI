import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wellxai.chatgiza",
  appName: "ChatGiZa",
  webDir: "public",
  server: {
    url: "https://chatgiza.com",
    androidScheme: "https",
  },
};

export default config;
