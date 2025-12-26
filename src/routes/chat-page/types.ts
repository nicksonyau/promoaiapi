export type ChatPageConfig = {
  widgetId: string;

  branding?: {
    companyName?: string;
    companyUrl?: string;
    companyLogo?: string; // URL (for now)
  };

  appearance?: {
    backgroundMode?: "widget" | "solid" | "image";
    backgroundColor?: string; // hex
    backgroundImage?: string; // URL (for now)
  };

  header?: {
    title?: string;
    welcomeMessage?: string;
  };

  theme?: {
    accentColor?: string; // hex
    userBubbleColor?: string; // hex
    botBubbleStyle?: "light" | "brand-soft";
    input?: {
      borderColor?: string;     // hex
      focusColor?: string;      // hex
      sendButtonColor?: string; // hex
    };
  };

  createdAt?: string;
  updatedAt?: string;
};
