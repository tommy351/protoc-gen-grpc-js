import { CodeGeneratorRequest } from "google-protobuf/google/protobuf/compiler/plugin_pb";
import {
  DescriptorProto,
  FileDescriptorProto,
  MethodDescriptorProto,
  ServiceDescriptorProto,
} from "google-protobuf/google/protobuf/descriptor_pb";
import {
  getJSMessageFileName,
  getJSServiceFileName,
  getMessageFullName,
  getMessageIdentifierName,
  getModuleAlias,
  trimPrefix,
} from "./utils";

export class Context {
  public readonly files: readonly InputFile[];
  public readonly params: readonly string[];
  private readonly messageMap = new Map<string, Message>();

  constructor(request: CodeGeneratorRequest) {
    this.files = request
      .getProtoFileList()
      .map((file) => new InputFile(this, file));

    this.params = (request.getParameter() || "")
      .split(",")
      .map((x) => x.trim());

    for (const file of this.files) {
      for (const msg of file.messages) {
        this.messageMap.set(msg.fullName, msg);
      }
    }
  }

  public findMessageByFullName(name: string): Message | undefined {
    return this.messageMap.get(name);
  }
}

export class InputFile {
  constructor(
    private readonly context: Context,
    public readonly descriptor: FileDescriptorProto
  ) {}

  public get name(): string {
    return this.descriptor.getName() || "";
  }

  public get package(): string {
    return this.descriptor.getPackage() || "";
  }

  public get jsServiceFileName(): string {
    return getJSServiceFileName(this.name);
  }

  public get jsMessageFileName(): string {
    return getJSMessageFileName(this.name);
  }

  public get messages(): Message[] {
    return this.descriptor
      .getMessageTypeList()
      .map((proto) => new Message(this, proto));
  }

  public get dependencies(): Dependency[] {
    return this.descriptor
      .getDependencyList()
      .map((name) => new Dependency(name));
  }

  public get services(): Service[] {
    return this.descriptor
      .getServiceList()
      .map((proto) => new Service(this.context, this, proto));
  }
}

export class Message {
  constructor(
    public readonly file: InputFile,
    public readonly descriptor: DescriptorProto
  ) {}

  public get name(): string {
    return this.descriptor.getName() || "";
  }

  public get package(): string {
    return this.file.package;
  }

  public get fullName(): string {
    return getMessageFullName(this.file.descriptor, this.descriptor);
  }

  public get identifierName(): string {
    return getMessageIdentifierName(this.fullName);
  }

  public get nodeObjectPath(): string {
    const alias = getModuleAlias(this.file.name);
    const name = trimPrefix(this.fullName, this.package + ".");

    return alias + "." + name;
  }
}

export class Service {
  constructor(
    private readonly context: Context,
    public readonly file: InputFile,
    public readonly descriptor: ServiceDescriptorProto
  ) {}

  public get name(): string {
    return this.descriptor.getName() || "";
  }

  public get package(): string {
    return this.file.package;
  }

  public get fullName(): string {
    return getMessageFullName(this.file.descriptor, this.descriptor);
  }

  public get methods(): Method[] {
    return this.descriptor
      .getMethodList()
      .map((proto) => new Method(this.context, this, proto));
  }

  public get messages(): Message[] {
    const messages: Message[] = [];

    for (const method of this.methods) {
      const inputType = method.inputType;
      const outputType = method.outputType;

      if (inputType) messages.push(inputType);
      if (outputType) messages.push(outputType);
    }

    return messages;
  }
}

export class Dependency {
  constructor(public readonly name: string) {}

  public get jsMessageFileName(): string {
    return getJSMessageFileName(this.name);
  }
}

export class Method {
  constructor(
    private readonly context: Context,
    public readonly service: Service,
    public readonly descriptor: MethodDescriptorProto
  ) {}

  public get name(): string {
    return this.descriptor.getName() || "";
  }

  public get inputType(): Message | undefined {
    return this.getMessage(this.descriptor.getInputType());
  }

  public get outputType(): Message | undefined {
    return this.getMessage(this.descriptor.getOutputType());
  }

  public get clientStreaming(): boolean {
    return this.descriptor.getClientStreaming() || false;
  }

  public get serverStreaming(): boolean {
    return this.descriptor.getServerStreaming() || false;
  }

  private getMessage(name?: string): Message | undefined {
    if (!name) return;
    return this.context.findMessageByFullName(trimPrefix(name, "."));
  }
}
