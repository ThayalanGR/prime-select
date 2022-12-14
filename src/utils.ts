import rfdc from 'rfdc';
import isEqual from 'lodash.isequal';
import transform from 'lodash.transform';
import isObject from 'lodash.isobject';

export const roughSizeOfObject = (object: unknown) => {
    const objectList: unknown[] = [];

    const recurse = (value: Record<string, unknown>) => {
        let bytes = 0;

        if (typeof value === 'boolean') {
            bytes = 4;
        } else if (typeof value === 'string') {
            bytes = (<string>value).length * 2;
        } else if (typeof value === 'number') {
            bytes = 8;
        } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
            objectList[objectList.length] = value;
            const keys = Object.keys(value as Object);
            keys.forEach((key) => {
                if (value[key] !== null) {
                    bytes += 8; // an assumed existence overhead
                    bytes += recurse(value[key] as Record<string, unknown>);
                }
            });
        }

        return bytes;
    };

    const bytes = recurse(object as Record<string, unknown>) || 0;

    return {
        bytes,
        kilobytes: bytes / 1024 || 0,
        megabytes: bytes / 1048576 || 0,
    };
};

export const clone = rfdc();

const KEY_DELIMITER = '~||~';
export const formKey = (...args: string[]) => {
    return args.join(KEY_DELIMITER);
};

export const deepDiff = (object: Object, base: unknown) =>
    transform(object, (result: Record<string, unknown>, value, key) => {
        if (!isEqual(value, (<Object>base)[key])) {
            result[key] = <Object>(
                (isObject(<unknown>value) && isObject((<Object>base)[key])
                    ? deepDiff(value, (<Object>base)[key])
                    : value)
            );
        }
    });
