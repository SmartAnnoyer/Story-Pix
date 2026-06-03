import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]{}\-_=+\\|;:'",.<>/?`~]).{8,}$/;

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && PASSWORD_REGEX.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be at least 8 characters and include uppercase, lowercase, number, and special character`;
        },
      },
    });
  };
}

export const PASSWORD_VALIDATION_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
