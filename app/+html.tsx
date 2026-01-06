// app/+html.tsx
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function RootHtml({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <head>
                {/* viewport untuk mobile web */}
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, viewport-fit=cover"
                />

                {/* rekomendasi expo-router untuk web scrolling behavior */}
                <ScrollViewStyleReset />

                {/* optional: mencegah layout “kepotong” */}
                <style>{`
          html, body { height: 100%; margin: 0; }
          #root { min-height: 100dvh; }
        `}</style>
            </head>
            <body>{children}</body>
        </html>
    );
}
