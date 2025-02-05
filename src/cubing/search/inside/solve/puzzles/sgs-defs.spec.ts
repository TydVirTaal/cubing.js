import { cachedSGSData3x3x3 } from "./3x3x3-inefficient.sgs.json";
import { cachedData222 } from "./2x2x2.sgs.json";
import { cachedSGSDataMegaminx } from "./megaminx.sgs.json";
import { sgsDataPyraminx } from "./pyraminx.sgs.json";
import { sgsDataSkewb } from "./skewb.sgs.json";

describe("SGS", () => {
  it("Parses 2x2x2 SGS", () => {
    expect(cachedData222).not.toThrow();
  });

  it("Parses inefficient 3x3x3 SGS", () => {
    expect(cachedSGSData3x3x3).not.toThrow();
  });

  it("Parses Megaminx SGS", () => {
    expect(cachedSGSDataMegaminx).not.toThrow();
  });

  it("Parses Pyraminx SGS", () => {
    expect(sgsDataPyraminx).not.toThrow();
  });

  it("Parses Skewb SGS", () => {
    expect(sgsDataSkewb).not.toThrow();
  });
});
