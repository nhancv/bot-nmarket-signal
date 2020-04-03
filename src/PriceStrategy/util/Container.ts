/**
 * This container ensure the size is not over expected length
 */

export interface IContainer {

  push(key, value): void;

  last(): any;

  remove(key): void;

  getKeys(): any[];

  getValues(): any[];

  getValuesByFilter(Fn: (value) => any): any[]

  getMaxSize(): number;

  clear(): void;
}

export class Container implements IContainer {

  keyArr: any[] = [];
  values: any = {};
  maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.push = this.push.bind(this);
    this.remove = this.remove.bind(this);
    this.getKeys = this.getKeys.bind(this);
    this.getValues = this.getValues.bind(this);
    this.getValuesByFilter = this.getValuesByFilter.bind(this);
    this.getMaxSize = this.getMaxSize.bind(this);
    this.clear = this.clear.bind(this);
  }

  getMaxSize(): number {
    return this.maxSize;
  }

  getValues(): any[] {
    return this.getValuesByFilter(value => value);
  }

  getValuesByFilter(Fn: (value) => any): any[] {
    let res: any[] = [];
    this.keyArr.forEach((k) => {
      res.push(Fn(this.values[k]))
    });
    return res;
  }

  push(key, value): void {
    if (!this.values.hasOwnProperty(key)) {
      if (this.keyArr.length === this.maxSize) {
        let first = this.keyArr[0];
        this.remove(first);
      }
      this.keyArr.push(key);
      this.values[key] = value;
    } else {
      this.values[key] = value;
    }
  }

  getKeys(): any[] {
    return this.keyArr.slice(0); //clone new array
  }

  clear(): void {
    this.keyArr = [];
    this.values = {};
  }

  remove(key): void {
    let index = this.keyArr.indexOf(key);
    if (index > -1) {
      this.keyArr.splice(index, 1);
      delete this.values[key];
    }
  }

  last(): any {
    let l = this.keyArr.length;
    if (l > 0) {
      return this.values[this.keyArr[l - 1]];
    }
    return null;
  }


}


