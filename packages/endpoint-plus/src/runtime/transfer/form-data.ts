import { isBlob, isNil } from 'es-toolkit';

export function serializeToFormData(data?: Record<string, unknown>): FormData {
  if (typeof FormData === 'undefined') {
    throw new TypeError('Endpoint upload requires FormData support in the current runtime.');
  }

  const formData = new FormData();
  if (!data) {
    return formData;
  }

  for (const [key, value] of Object.entries(data)) {
    if (isNil(value)) {
      continue;
    }

    if (isBlob(value)) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  }

  return formData;
}
