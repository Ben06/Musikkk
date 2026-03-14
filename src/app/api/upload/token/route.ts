import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate the upload (auth already checked above)
        return {
          allowedContentTypes: [
            "audio/mpeg",
            "audio/wav",
            "audio/ogg",
            "audio/flac",
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Could store metadata here if needed
        console.log("Upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = (error as Error).message;
    // Missing token or server config → 500 so client can show "server error"
    const isServerError =
      message.includes("BLOB_READ_WRITE_TOKEN") ||
      message.includes("token") ||
      message.includes("environment");
    return NextResponse.json(
      { error: message },
      { status: isServerError ? 500 : 400 }
    );
  }
}
