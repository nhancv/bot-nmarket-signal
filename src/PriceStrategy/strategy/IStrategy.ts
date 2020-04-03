import {IContainer} from "../util/Container";

export interface IStrategy {
  getName(): string;

  getFetchingPeriod(): string;

  getFetchingRange(): number;

  checking(container: IContainer, config?: any): {
    success: boolean,
    message: any
  }
}
