import getStdin from "get-stdin";
import {
  CodeGeneratorRequest,
  CodeGeneratorResponse,
} from "google-protobuf/google/protobuf/compiler/plugin_pb";
import assert from "assert";
import { Context, InputFile, Message, Method, Service } from "./types";
import {
  getModuleAlias,
  getRelativePath,
  indent,
  lowerCaseFirstLetter,
} from "./utils";

function printFileComments(file: InputFile): string {
  // TODO
  return "";
}

function printImports(ctx: Context, file: InputFile): string {
  const output = [];
  const deps: Record<string, string> = {};

  if (file.messages.length) {
    deps[file.name] = file.jsMessageFileName;
  }

  for (const dep of file.dependencies) {
    deps[dep.name] = dep.jsMessageFileName;
  }

  if (!ctx.params.generatePackageDefinition) {
    const grpcPkg = ctx.params.grpcJs ? "@grpc/grpc-js" : "grpc";
    output.push(`const grpc = require(${JSON.stringify(grpcPkg)});`);
  }

  for (const [key, value] of Object.entries(deps)) {
    const alias = getModuleAlias(key);
    const path = getRelativePath(file.name, value);

    output.push(`const ${alias} = require(${JSON.stringify(path)});`);
  }

  return output.join("\n");
}

function printMessageTransformer(message: Message): string {
  return `
function serialize_${message.identifierName}(arg) {
  if (!arg instanceof ${message.nodeObjectPath}) {
    throw new Error("Expected argument of type ${message.fullName}");
  }

  return Buffer.from(arg.serializeBinary());
}

function deserialize_${message.identifierName}(arg) {
  return ${message.nodeObjectPath}.deserializeBinary(new Uint8Array(arg));
}
`.trim();
}

function printTransformers(file: InputFile): string {
  const msgMap = new Map<string, Message>();

  for (const svc of file.services) {
    for (const msg of svc.messages) {
      msgMap.set(msg.identifierName, msg);
    }
  }

  return [...msgMap.values()]
    .map((msg) => printMessageTransformer(msg))
    .join("\n\n");
}

function printMethod(method: Method): string {
  assert(method.inputType);
  assert(method.outputType);

  return `
{
  path: ${JSON.stringify(`/${method.service.fullName}/${method.name}`)},
  requestStream: ${method.clientStreaming},
  responseStream: ${method.serverStreaming},
  requestType: ${method.inputType.nodeObjectPath},
  responseType: ${method.outputType.nodeObjectPath},
  requestSerialize: serialize_${method.inputType.identifierName},
  requestDeserialize: deserialize_${method.inputType.identifierName},
  responseSerialize: serialize_${method.outputType.identifierName},
  responseDeserialize: deserialize_${method.outputType.identifierName}
}
`.trim();
}

function printService(ctx: Context, service: Service): string {
  const output: string[] = [];

  if (ctx.params.generatePackageDefinition) {
    output.push(
      `const ${service.name}Service = exports[${JSON.stringify(
        service.fullName
      )}] = {`
    );
  } else {
    output.push(
      `const ${service.name}Service = exports.${service.name}Service = {`
    );
  }

  for (const method of service.methods) {
    const name = lowerCaseFirstLetter(method.name);
    output.push(`  ${name}: ${indent(printMethod(method), "  ").trim()},`);
  }

  output.push("};\n");

  if (!ctx.params.generatePackageDefinition) {
    output.push(
      `exports.${service.name}Client = grpc.makeGenericClientConstructor(${service.name}Service);`
    );
  }

  return output.join("\n");
}

function printServices(ctx: Context, file: InputFile): string {
  return file.services.map((svc) => printService(ctx, svc)).join("\n\n");
}

function generateFile(ctx: Context, file: InputFile): string {
  if (!file.services.length) {
    return "";
  }

  return `
// GENERATED CODE -- DO NOT EDIT!
${printFileComments(file)}
/* eslint-disable */
"use strict";

${printImports(ctx, file)}

${printTransformers(file)}

${printServices(ctx, file)}
`.trim();
}

export async function generate(): Promise<void> {
  const input = await getStdin.buffer();
  const request = CodeGeneratorRequest.deserializeBinary(input);
  const ctx = new Context(request);
  const response = new CodeGeneratorResponse();

  response.setSupportedFeatures(
    CodeGeneratorResponse.Feature.FEATURE_PROTO3_OPTIONAL
  );

  for (const file of ctx.files) {
    const content = generateFile(ctx, file);

    if (content) {
      const outputFile = new CodeGeneratorResponse.File();
      outputFile.setContent(content);
      outputFile.setName(file.jsServiceFileName);
      response.addFile(outputFile);
    }
  }

  process.stdout.write(response.serializeBinary());
}
