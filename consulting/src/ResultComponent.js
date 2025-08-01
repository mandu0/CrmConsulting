import React, { useEffect, useState, useRef, useMemo } from "react";
import "./ResultComponent.css";

export default function ResultComponent({ data, onResidualCalculated }) {
  const [sheetData, setSheetData] = useState(null);
  const [smileAblationsLeft, setSmileAblationsLeft] = useState([]);
  const [smileAblationsRight, setSmileAblationsRight] = useState([]);
  const prevResidualsRef = useRef(null);

  useEffect(() => {
    const sheetUrl =
      "https://docs.google.com/spreadsheets/d/13qoQ6mFM6koCfP0OQVeWl_1D71n8UhRw7290ikEwtvY/gviz/tq?tqx=out:json&gid=1295416706";

    const fetchSheet = async () => {
      try {
        const res = await fetch(sheetUrl);
        const txt = await res.text();
        const jsonStr = txt.substring(txt.indexOf("{"), txt.lastIndexOf("}") + 1);
        const json = JSON.parse(jsonStr);
        setSheetData(json.table.rows);
      } catch (error) {
        console.error("Sheet fetch failed:", error);
      }
    };

    fetchSheet();
  }, []);

  const smileSheets = [
    { name: "6.0mm", gid: "0" },
    { name: "6.3mm", gid: "1850036941" },
    { name: "6.5mm", gid: "115100868" },
    { name: "6.8mm", gid: "836732641" },
  ];

  const findClosestIndex = (arr, val) => {
    let closestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] == null) continue;
      const diff = Math.abs(arr[i] - val);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  useEffect(() => {
    if (
      data.leftMyopia == null ||
      data.leftAstigmatism == null ||
      data.rightMyopia == null ||
      data.rightAstigmatism == null
    )
      return;

    const fetchAblations = async (sphValue, cylValue) => {
      const promises = smileSheets.map(async ({ gid }) => {
        try {
          const url = `https://docs.google.com/spreadsheets/d/13qoQ6mFM6koCfP0OQVeWl_1D71n8UhRw7290ikEwtvY/gviz/tq?tqx=out:json&gid=${gid}`;
          const res = await fetch(url);
          const txt = await res.text();
          const jsonStr = txt.substring(txt.indexOf("{"), txt.lastIndexOf("}") + 1);
          const json = JSON.parse(jsonStr);
          const rows = json.table.rows;

          if (!rows || rows.length === 0) {
            console.warn(`No data in sheet gid=${gid}`);
            return null;
          }

          const sphValues = rows.map((row) => Number(row?.c?.[0]?.v ?? NaN));
          const cylValues = rows[0]?.c?.slice(1, 22).map((cell) => Number(cell?.v ?? NaN));

          const sphIdx = findClosestIndex(sphValues, sphValue);
          const cylIdx = findClosestIndex(cylValues, cylValue);

          const targetRow = rows[sphIdx];
          if (!targetRow || !targetRow.c) return null;

          return Number(targetRow.c[cylIdx + 1]?.v ?? null);
        } catch (err) {
          console.error(`Failed to fetch sheet gid=${gid}`, err);
          return null;
        }
      });
      return Promise.all(promises);
    };

    (async () => {
      const left = await fetchAblations(Number(data.leftMyopia), Number(data.leftAstigmatism));
      const right = await fetchAblations(Number(data.rightMyopia), Number(data.rightAstigmatism));

      setSmileAblationsLeft(left);
      setSmileAblationsRight(right);
    })();
  }, [data.leftMyopia, data.leftAstigmatism, data.rightMyopia, data.rightAstigmatism]);

  const leftSum = Number(data.leftMyopia) + Number(data.leftAstigmatism);
  const rightSum = Number(data.rightMyopia) + Number(data.rightAstigmatism);
  const pupilSizes = ["5.5mm", "6.0mm", "6.5mm"];

  const getAblationValues = (matchedRow) => {
    if (!matchedRow) return [0, 0, 0];
    return [
      Number(matchedRow.c[1]?.v ?? 0),
      Number(matchedRow.c[2]?.v ?? 0),
      Number(matchedRow.c[3]?.v ?? 0),
    ];
  };

  const calculateResidual = (cornealThickness, ablation) => Math.max(cornealThickness - ablation, 0);

  const matchedRowLeft = sheetData?.find((row) => Number(row.c[0]?.v) === leftSum) ?? null;
  const matchedRowRight = sheetData?.find((row) => Number(row.c[0]?.v) === rightSum) ?? null;

  const leftAblationValues = useMemo(() => getAblationValues(matchedRowLeft), [matchedRowLeft]);
  const rightAblationValues = useMemo(() => getAblationValues(matchedRowRight), [matchedRowRight]);

  useEffect(() => {
    if (!sheetData) return;

    const lasikLeftResiduals = leftAblationValues.map((val) =>
      calculateResidual(Number(data.leftCornealThickness), val)
    );
    const lasikRightResiduals = rightAblationValues.map((val) =>
      calculateResidual(Number(data.rightCornealThickness), val)
    );

    const smileLeftResiduals = smileAblationsLeft.map((val) =>
      val != null ? calculateResidual(Number(data.leftCornealThickness), val) : null
    );
    const smileRightResiduals = smileAblationsRight.map((val) =>
      val != null ? calculateResidual(Number(data.rightCornealThickness), val) : null
    );

    const residuals = {
      lasik: { left: lasikLeftResiduals, right: lasikRightResiduals },
      smile: { left: smileLeftResiduals, right: smileRightResiduals },
    };

    const ablations = {
      lasik: { left: leftAblationValues, right: rightAblationValues },
      smile: { left: smileAblationsLeft, right: smileAblationsRight },
    };


    const prev = prevResidualsRef.current;
    if (JSON.stringify(prev) !== JSON.stringify(residuals)) {
      if (onResidualCalculated) {
        const leftMyopia = Math.abs(Number(data.leftMyopia));
        const rightMyopia = Math.abs(Number(data.rightMyopia));

        const exclusionFlags = {
          left: leftMyopia <= 0.25 || leftMyopia >= 8.5,
          right: rightMyopia <= 0.25 || rightMyopia >= 8.5,
        };
        // 6.0mm 절삭량만 따로 뽑아서 추가 인자로 넘기기
        const smile6mm = {
          left: smileAblationsLeft?.[0] ?? null,
          right: smileAblationsRight?.[0] ?? null,
        };

        // 콘솔에 6.0mm 절삭량 출력
        console.log("6.0mm 기준 스마일 절삭량:", smile6mm);
        // onResidualCalculated 호출 시 4번째 인자로 smile6mm 추가 전달
        onResidualCalculated(residuals, ablations, exclusionFlags, smile6mm);
      }
      prevResidualsRef.current = residuals;
    }
  }, [
    sheetData,
    leftAblationValues,
    rightAblationValues,
    smileAblationsLeft,
    smileAblationsRight,
    data.leftCornealThickness,
    data.rightCornealThickness,
    onResidualCalculated,
  ]);

  return (
    <div className="inputContainer">
      <div className="inputBox">
        <div className="summary-bars">
          {/* 각막 두께 */}
          <div className="summary-section">
            <h3 className="summaryTitle">각막두께</h3>
            <div className="summaryBox">
              <div className="summary-bar thickness-bar">
                <div className="thin-1"></div>
                <div className="thin-2"></div>
                <div className="average"></div>
                <div className="thick-1"></div>
                <div className="thick-2"></div>
              </div>
              <div className="label-bar">
                <div>400~460 (얇음)</div>
                <div>460~500 (조금 얇음)</div>
                <div>500~550 (평균)</div>
                <div>550~600 (두꺼움)</div>
                <div>600~ (매우 두꺼움)</div>
              </div>
            </div>
          </div>

          {/* 동공 크기 */}
          <div className="summary-section">
            <h3 className="summaryTitle">동공크기</h3>
            <div className="summaryBox">
              <div className="summary-bar pupil-bar">
                <div className="pupil-small">~5.5 (작음)</div>
                <div className="pupil-normal">5.5~6.5 (정상)</div>
                <div className="pupil-large">6.5~ (큼)</div>
              </div>
              <div className="pupil-desc-bar">
                <div>야간 빛 번짐, 눈부심 적음</div>
                <div></div>
                <div>많음</div>
              </div>
            </div>
          </div>
        </div>


        {/* 원시/근시 & 난시 그래프 나란히 정렬 */}
        <div className="graph-row-container">
          {/* 원시, 정시, 근시 그래프 */}
          <div className="line-graph-wrapper">
            <div className="line-graph-top-labels">
              <span className="labels farsighted left-align">원시 (+)</span>
              <span className="labels emmetropia center-align">정시 (0)</span>
              <span className="labels myopia right-align">근시 (-)</span>
            </div>

            <div className="divider-line-container">
              <div className="horizontal-line"></div>
              <div className="vertical-line line0"></div>
              <div className="vertical-line line1"></div>
              <div className="vertical-line line2"></div>
              <div className="vertical-line line3"></div>
              <div className="vertical-line line4"></div>
              <div className="vertical-line line5"></div>
            </div>

            <div className="myopia-range-labels">
              <span></span>
              <span>0 ~ -3D</span>
              <span>-3D ~ -6D</span>
              <span>-6D ~ -10D</span>
              <span>-10D이상</span>
            </div>

            <div className="myopia-name-labels">
              <span></span>
              <span>경도</span>
              <span>중증도</span>
              <span>고도</span>
              <span>초고도</span>
            </div>
          </div>

          {/* 난시 그래프 */}
          <div className="line-graph-wrapper">
            <div className="line-graph-top-labels">
              <span className="labels farsighted left-align">난시</span>
            </div>

            <div className="divider-line-container">
              <div className="horizontal-line"></div>
              <div className="vertical-line line0"></div>
              <div className="vertical-line line6"></div>
              <div className="vertical-line line7"></div>
              <div className="vertical-line line8"></div>
              <div className="vertical-line line5"></div>
            </div>

            <div className="myopia-range-labels1">
              <span>0 ~ -1D</span>
              <span>-1D ~ -2D</span>
              <span>-2D ~ -3D</span>
              <span>-3D이상</span>
            </div>

            <div className="myopia-name-labels1">
              <span>경도</span>
              <span>중증도</span>
              <span>고도</span>
              <span>초고도</span>
            </div>
          </div>
        </div>


        <div className="eyes-wrapper">
          {/* 오른쪽 눈 */}
          <div className="eye-block-container">
            <div className="eye-heading">
              <h2>👁 R </h2>
              <span className="target-vision-text">[ 목표시력: {data.rightTargetVision} ]</span>
            </div>
            <table border="1" cellPadding="6" style={{ marginBottom: "12px", width: "100%" }}>
              <thead>
                <tr>
                  <th>각막 두께</th>
                  <th>근시</th>
                  <th>난시</th>
                  <th>동공 크기</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{data.rightCornealThickness}</td>
                  <td
                    style={{
                      color:
                        Math.abs(Number(data.rightMyopia)) <= 0.25 ||
                          Math.abs(Number(data.rightMyopia)) >= 8.5
                          ? "red"
                          : "inherit",
                    }}
                  >
                    {data.rightMyopia}
                  </td>
                  <td>{data.rightAstigmatism}</td>
                  <td>{data.rightPupilSize}</td>
                </tr>
              </tbody>
            </table>

            {matchedRowRight ? (
              <>
                <h3>라식 & 라섹</h3>
                <table border="1" cellPadding="5">
                  <thead>
                    <tr>
                      <th>동공크기</th>
                      {pupilSizes.map((size) => (
                        <th key={size}>{size}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="tdblue">절삭량</td>
                      {rightAblationValues.map((val, i) => (
                        <td key={i}>{val}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="tdblue">잔여 각막</td>
                      {rightAblationValues
                        .map((val) => calculateResidual(Number(data.rightCornealThickness), val))
                        .map((residual, i) => (
                          <td key={"residual-" + i}>{residual}</td>
                        ))}
                    </tr>
                  </tbody>
                </table>
              </>
            ) : (
              <p>오른쪽 눈 합산값에 맞는 점수 데이터를 찾을 수 없습니다.</p>
            )}

            {/* 오른쪽 눈 스마일 절삭량 테이블 추가 */}
            <div style={{ marginTop: "20px" }}>
              <h3>스마일 라식 & 스마일 프로</h3>
              <table border="1" cellPadding="5">
                <thead>
                  <tr>
                    <th>동공크기</th>
                    {smileSheets.map((sheet) => (
                      <th key={sheet.gid}>{sheet.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="tdblue">절삭량</td>
                    {smileAblationsRight.map((val, i) => (
                      <td
                        key={i}
                        style={{ color: val !== null && val >= 140 ? "red" : "inherit" }}
                      >
                        {val !== null ? val : "-"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="tdblue">잔여 각막</td>
                    {smileAblationsRight.map((val, i) => (
                      <td key={"residual-right-" + i}>
                        {val !== null
                          ? calculateResidual(Number(data.rightCornealThickness), val)
                          : "-"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 왼쪽 눈 */}
          <div className="eye-block-container">
            <div className="eye-heading">
              <h2>👁 L </h2>
              <span className="target-vision-text">[ 목표시력: {data.leftTargetVision} ]</span>
            </div>
            <table border="1" cellPadding="6" style={{ marginBottom: "12px", width: "100%" }}>
              <thead>
                <tr>
                  <th>각막 두께</th>
                  <th>근시</th>
                  <th>난시</th>
                  <th>동공 크기</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{data.leftCornealThickness}</td>
                  <td
                    style={{
                      color:
                        Math.abs(Number(data.leftMyopia)) <= 0.25 ||
                          Math.abs(Number(data.leftMyopia)) >= 8.5
                          ? "red"
                          : "inherit",
                    }}
                  >
                    {data.leftMyopia}
                  </td>
                  <td>{data.leftAstigmatism}</td>
                  <td>{data.leftPupilSize}</td>
                </tr>
              </tbody>
            </table>

            {matchedRowLeft ? (
              <>
                <h3>라식 & 라섹</h3>
                <table border="1" cellPadding="5">
                  <thead>
                    <tr>
                      <th>동공크기</th>
                      {pupilSizes.map((size) => (
                        <th key={size}>{size}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="tdblue">절삭량</td>
                      {leftAblationValues.map((val, i) => (
                        <td key={i}>{val}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="tdblue">잔여 각막</td>
                      {leftAblationValues
                        .map((val) => calculateResidual(Number(data.leftCornealThickness), val))
                        .map((residual, i) => (
                          <td key={"residual-" + i}>{residual}</td>
                        ))}
                    </tr>
                  </tbody>
                </table>
              </>
            ) : (
              <p>왼쪽 눈 합산값에 맞는 점수 데이터를 찾을 수 없습니다.</p>
            )}

            {/* 왼쪽 눈 스마일 절삭량 테이블 추가 */}
            <div style={{ marginTop: "20px" }}>
              <h3>스마일 라식 & 스마일 프로</h3>
              <table border="1" cellPadding="5">
                <thead>
                  <tr>
                    <th>동공크기</th>
                    {smileSheets.map((sheet) => (
                      <th key={sheet.gid}>{sheet.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="tdblue">절삭량</td>
                    {smileAblationsLeft.map((val, i) => (
                      <td
                        key={i}
                        style={{ color: val !== null && val >= 140 ? "red" : "inherit" }}
                      >
                        {val !== null ? val : "-"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="tdblue">잔여 각막</td>
                    {smileAblationsLeft.map((val, i) => (
                      <td key={"residual-left-" + i}>
                        {val !== null
                          ? calculateResidual(Number(data.leftCornealThickness), val)
                          : "-"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
