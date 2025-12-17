import { hilog } from "@kit.PerformanceAnalysisKit";

const DOMAIN = 0x0002;
const TestTag = "fuckohos"
// hilog | grep -i "edu.bupt.universalcomputer" -D 0x0002
// hilog  -D 0x0002
// hilog |grep xxx fuckohos
// hilog -T fuckohos

export class MyLogger {
  public log(message: string) {
    console.debug(message);
    hilog.debug(DOMAIN, TestTag, '%{public}s', message);
  }
}

export const myLogger: MyLogger = new MyLogger();