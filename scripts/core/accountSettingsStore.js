const AVATAR_SOURCES = {
  business: "./assets/avatars/avatar-bird-business.png",
  sport: "./assets/avatars/avatar-bird-sport.png",
  architect: "./assets/avatars/avatar-bird-architect.png",
};

const AVATAR_VARIANTS = {
  client: [
    {
      id: "client-bird-1",
      label: "Business Bird",
      src: AVATAR_SOURCES.business,
    },
    {
      id: "client-bird-2",
      label: "Sport Bird",
      src: AVATAR_SOURCES.sport,
    },
    {
      id: "client-bird-3",
      label: "Architect Bird",
      src: AVATAR_SOURCES.architect,
    },
  ],
  developer: [
    {
      id: "developer-bird-1",
      label: "Business Bird",
      src: AVATAR_SOURCES.business,
    },
    {
      id: "developer-bird-2",
      label: "Sport Bird",
      src: AVATAR_SOURCES.sport,
    },
    {
      id: "developer-bird-3",
      label: "Architect Bird",
      src: AVATAR_SOURCES.architect,
    },
  ],
};

export function getDefaultAvatarOptions(role = "client") {
  const options = AVATAR_VARIANTS[role] || AVATAR_VARIANTS.client;

  return options.map((option) => ({
    id: option.id,
    label: option.label,
    src: option.src,
  }));
}

export function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error || new Error("Image file could not be read."));
    reader.readAsDataURL(file);
  });
}
