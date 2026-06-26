import { serializeToFormData } from './form-data';

export function resolveUploadBody(data?: FormData | Record<string, unknown>): FormData {
  if (isFormData(data)) {
    return data;
  }

  return serializeToFormData(data);
}

function isFormData(data: unknown): data is FormData {
  return typeof FormData !== 'undefined' && data instanceof FormData;
}
