import printValue from './util/printValue';
import toArray from './util/toArray';

let strReg = /\$\{\s*(\w+)\s*\}/g;

type Params = Record<string, unknown>;

// 非抽象类实现非抽象类，实现类里面所有的属性和方法都要在目标类里重新定义和实现
class ValidationErrorNoStack implements ValidationError {
  name: string;
  message: string;

  value: any;
  path?: string;
  type?: string;
  params?: Params;

  errors: string[];
  inner: ValidationError[];

  constructor(
    errorOrErrors: string | ValidationError | readonly ValidationError[],
    value?: any,
    field?: string,
    type?: string,
  ) {
    this.name = 'ValidationError';
    this.value = value;
    this.path = field;
    this.type = type;

    this.errors = [];
    this.inner = [];

    toArray(errorOrErrors).forEach((err) => {
      if (ValidationError.isError(err)) {
        this.errors.push(...err.errors);
        const innerErrors = err.inner.length ? err.inner : [err];
        this.inner.push(...innerErrors);
      } else {
        this.errors.push(err);
      }
    });

    this.message =
      this.errors.length > 1
        ? `${this.errors.length} errors occurred`
        : this.errors[0];
  }

  [Symbol.toStringTag] = 'Error';
}

// 在声明 class ValidationError 时，除了会创建一个名为 ValidationError 的类之外，同时也创建了一个名为 ValidationError 的类型（实例的类型）。
export default class ValidationError extends Error {
  value: any;
  path?: string;
  type?: string;
  params?: Params;

  errors: string[] = [];
  inner: ValidationError[] = [];

// static关键字用于定义类的静态成员，静态成员属于类本身，而非类的实例；可以在不创建类实例的情况下访问这些成员
// 提供的参数动态生成或格式化错误信息
  static formatError(
    message: string | ((params: Params) => string) | unknown,
    params: Params,
  ) {
    const path = params.label || params.path || 'this';
    if (path !== params.path) params = { ...params, path };

    if (typeof message === 'string')
      return message.replace(strReg, (_, key) => printValue(params[key]));
    if (typeof message === 'function') return message(params);

    return message;
  }

  static isError(err: any): err is ValidationError {
    return err && err.name === 'ValidationError';
  }

  constructor(
    errorOrErrors: string | ValidationError | readonly ValidationError[],
    value?: any,
    field?: string,
    type?: string,
    disableStack?: boolean,
  ) {
    const errorNoStack = new ValidationErrorNoStack(
      errorOrErrors,
      value,
      field,
      type,
    );

    if (disableStack) {
      return errorNoStack;
    }

    super();

    this.name = errorNoStack.name;
    this.message = errorNoStack.message;
    this.type = errorNoStack.type;
    this.value = errorNoStack.value;
    this.path = errorNoStack.path;
    this.errors = errorNoStack.errors;
    this.inner = errorNoStack.inner;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  static [Symbol.hasInstance](inst: any) {
    return (
      ValidationErrorNoStack[Symbol.hasInstance](inst) ||
      super[Symbol.hasInstance](inst)
    );
  }

  [Symbol.toStringTag] = 'Error';
}
