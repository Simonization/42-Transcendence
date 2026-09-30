import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * The decorated date string must not be later than another property of the same DTO. Passes when
 * either side is missing, so partial updates are checked against the stored value in the command.
 */
export function IsNotAfter(otherProperty: string, options?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'isNotAfter',
            target: object.constructor,
            propertyName,
            constraints: [otherProperty],
            options: { message: `${propertyName} must not be after ${otherProperty}`, ...options },
            validator: {
                validate(value: unknown, args: ValidationArguments) {
                    const other = (args.object as Record<string, unknown>)[args.constraints[0]];
                    if (value === null || value === undefined || other === null || other === undefined) return true;
                    const a = new Date(value as string).getTime();
                    const b = new Date(other as string).getTime();
                    if (Number.isNaN(a) || Number.isNaN(b)) return true; // IsDateString reports it
                    return a <= b;
                },
            },
        });
    };
}
