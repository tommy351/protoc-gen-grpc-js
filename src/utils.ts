import { FileDescriptorProto } from "google-protobuf/google/protobuf/descriptor_pb";

export function trimPrefix(input: string, prefix: string): string {
  if (input.startsWith(prefix)) {
    return input.substring(prefix.length);
  }

  return input;
}

export function trimSuffix(input: string, suffix: string): string {
  if (input.endsWith(suffix)) {
    return input.substring(0, input.length - suffix.length);
  }

  return input;
}

export function stripProto(input: string): string {
  for (const ext of [".protodevel", ".proto"]) {
    const result = trimSuffix(input, ext);
    if (result !== input) return result;
  }

  return input;
}

export function getModuleAlias(input: string): string {
  const name = stripProto(input)
    .replace(/-/g, "$")
    .replace(/\//g, "_")
    .replace(/\./g, "_");

  return name + "_pb";
}

export function getRootPath(from: string, to: string): string {
  if (to.startsWith("google/protobuf")) {
    return "google-protobuf/";
  }

  const slashes = from.split("/").length - 1;

  if (!slashes) {
    return "./";
  }

  let result = "";

  for (let i = 0; i < slashes; i++) {
    result += "../";
  }

  return result;
}

export function getRelativePath(from: string, to: string): string {
  return getRootPath(from, to) + to;
}

export function getJSMessageFileName(input: string): string {
  return stripProto(input) + "_pb.js";
}

export function getJSServiceFileName(input: string): string {
  return stripProto(input) + "_grpc.pb.js";
}

export function getMessageFullName(
  file: FileDescriptorProto,
  msg: { getName(): string | undefined }
): string {
  return [file.getPackage(), msg.getName()].filter(Boolean).join(".");
}

export function getMessageIdentifierName(input: string): string {
  return input.replace(/\./g, "_");
}

export function lowerCaseFirstLetter(input: string): string {
  if (!input) return "";
  return input[0].toLowerCase() + input.substring(1);
}

export function upperCaseFirstLetter(input: string): string {
  if (!input) return "";
  return input[0].toUpperCase() + input.substring(1);
}

export function indent(input: string, space: string): string {
  return input
    .split("\n")
    .map((line) => `${space}${line}`)
    .join("\n");
}
