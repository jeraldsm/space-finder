import { Fn, Stack } from "aws-cdk-lib";


export function getSuffixFromStack(stack: Stack) {
    const shortStackId = Fn.select(2, Fn.split('/', stack.stackId));
    const suffix = Fn.select(4, Fn.split('-', shortStackId));
    return suffix;
}

export function replaceStringInYaml(obj: any, searchValue: string, replaceValue: string) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(searchValue, replaceValue);
      } else if (typeof obj[key] === 'object') {
        replaceStringInYaml(obj[key], searchValue, replaceValue);
      }
    }
  }
  