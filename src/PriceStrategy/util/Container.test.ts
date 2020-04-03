import 'jest'
import {IContainer, Container} from "./Container";

describe('Container: add, duplicate id', () => {
  test('should add operator', () => {
    let container: IContainer = new Container(3);
    container.push(1, 10);
    container.push(2, 10);
    expect(container.getValues().length).toBe(2);
  });
  test('should update value', () => {
    let container: IContainer = new Container(3);
    container.push(1, 10);
    container.push(1, 12);
    expect(container.getValues()[0]).toBe(12);
  });
});

describe('Container: over length', () => {
  test('should fixed length', () => {
    let length = 3;
    let container: IContainer = new Container(length);
    for(let i = 0; i<=length; i++){
      container.push(i, i);
    }
    expect(container.getValues().length).toBe(length);
  });
  test('should pop oldest item', () => {
    let length = 3;
    let container: IContainer = new Container(length);
    for(let i = 0; i<=length; i++){
      container.push(i, i);
    }
    let resArr = container.getValues();
    expect(resArr[0]).toBe(1);
    expect(resArr[length-1]).toBe(length);
  });
});

