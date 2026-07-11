let _url: string | null = null;

export function setProfilePhoto(url: string) {
  _url = url;
}

export function getProfilePhoto(): string | null {
  return _url;
}
