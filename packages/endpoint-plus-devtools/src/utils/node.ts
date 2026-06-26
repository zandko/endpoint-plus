import path from 'node:path';

export function normalizeProjectRelativeFile(file: string): string {
  const normalized = file
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '');

  if (!normalized) {
    throw new Error('outputFile must be a project-root-relative file path.');
  }

  const projectRelativeFile = path.posix.normalize(normalized);

  if (
    projectRelativeFile.endsWith('/') ||
    path.posix.isAbsolute(projectRelativeFile) ||
    projectRelativeFile === '..' ||
    projectRelativeFile.startsWith('../')
  ) {
    throw new Error('outputFile must be a project-root-relative file path.');
  }

  return projectRelativeFile;
}
