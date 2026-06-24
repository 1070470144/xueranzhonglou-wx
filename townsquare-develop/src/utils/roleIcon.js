import { displayExternalImageUrl } from "./externalImage";

const fallbackIcon = require("../assets/icons/custom.png");

function localIcon(id, imageAlt) {
  const iconId = String(imageAlt || id || "").trim();
  if (!iconId || iconId === "_meta") return fallbackIcon;
  try {
    return require("../assets/icons/" + iconId + ".png");
  } catch (error) {
    return fallbackIcon;
  }
}

export function roleIconImage(role, imageOptIn = true) {
  const jsonImage =
    role && (role.image || role.icon || role.imageUrl || role.image_url);
  return (
    (imageOptIn && displayExternalImageUrl(jsonImage)) ||
    localIcon(role && role.id, role && role.imageAlt)
  );
}

export function reminderIconImage(reminder, imageOptIn = true) {
  return (
    (imageOptIn && displayExternalImageUrl(reminder && reminder.image)) ||
    localIcon(reminder && reminder.role, reminder && reminder.imageAlt)
  );
}
