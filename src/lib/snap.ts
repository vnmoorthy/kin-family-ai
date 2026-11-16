import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

/** Pick or shoot a photo, upload to Convex storage, return the storage id. */
export async function pickAndUpload(
  source: "camera" | "library",
  generateUploadUrl: () => Promise<string>,
): Promise<{ storageId: string; uri: string } | null> {
  let result: ImagePicker.ImagePickerResult;
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.6, allowsEditing: false };
  if (source === "camera" && Platform.OS !== "web") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    result = await ImagePicker.launchCameraAsync(opts);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(opts);
  }
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const url = await generateUploadUrl();
  const blob = await (await fetch(asset.uri)).blob();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
    body: blob,
  });
  const { storageId } = await res.json();
  return { storageId, uri: asset.uri };
}
