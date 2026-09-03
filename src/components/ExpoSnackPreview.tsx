"use client";

interface ExpoSnackPreviewProps {
  files: { path: string; content: string }[];
  snackName: string;
}

/**
 * Embeds the Expo Snack SDK to give a real, working live preview
 * (in-browser + QR to Expo Go) without building a custom native runtime —
 * per the Fixed Tech Stack decision in the build command.
 */
export function ExpoSnackPreview({ files, snackName }: ExpoSnackPreviewProps) {
  const code = encodeURIComponent(JSON.stringify({ name: snackName, files }));
  const snackUrl = `https://snack.expo.dev/embedded?platform=mydevice&preview=true&data=${code}`;

  return (
    <div className="glass-card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Live Preview</h3>
        <span className="text-xs text-ink-secondary">Scan the QR code with Expo Go on your phone</span>
      </div>
      <iframe
        title="Expo Snack Preview"
        src={snackUrl}
        className="h-[600px] w-full rounded-2xl border border-line"
        allow="geolocation; camera; microphone"
      />
    </div>
  );
}
