import * as d3 from "d3";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import styles from "../Dashboard.module.css";
import api from '../../../api/axiosInstance';

interface LineChartProps {
  selectedGroup: "pw" | "u_totV" | "t_3";
}

interface RecordPoint {
  [key: string]: any;
}

interface PredictionPoint {
  predictedValue: number;
  state: string;
}

const predictionApiMap1 = {
  pw: "power",
  u_totV: "voltage",
  t_3: "temperature",
} as const;
const predictionApiMap2 = {
  pw: "recent100",
  u_totV: "recent100",
  t_3: "recent20",
} as const;

const stateFieldMap = {
  pw: "powerState",
  u_totV: "voltageState",
  t_3: "temperatureState",
} as const;

const stateColor = (state?: string) =>
  state === "NORMAL"
    ? "#14ca74"
    : state === "WARNING"
    ? "#f0ad4e"
    : state === "ERROR"
    ? "#d9534f"
    : "#ccc";

const margin = { top: 20, right: 50, bottom: 50, left: 50 };

export default function LineChart({ selectedGroup }: LineChartProps) {
  const { id } = useParams<{ id: string }>();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<RecordPoint[] | null>(null);
  const [predictionData, setPredictionData] = useState<PredictionPoint[] | null>(null);
  const [dim, setDim] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  // Resize Observer for responsive layout
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDim((prev) =>
        Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1
          ? { width, height }
          : prev
      );
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // // Fetch recent record data
  // const fetchRecordData = useCallback(() => {
  //   if (!id) return;

  //   api.get(`/api/pemfc/${id}/record/recent600`)
  //     .then((response) => {
  //       const arr = response.data;
  //       if (Array.isArray(arr)) {
  //         setData(arr.reverse());
  //         console.log(`(그래프) 최근 600개 레코드 데이터 호출 성공`);
  //       } else {
  //         console.warn("응답이 배열이 아님:", arr);
  //       }
  //     })
  //     .catch((error) => {
  //       console.error("그래프 레코드 데이터 호출 실패:", error);
  //     });
  // }, [id]);

  // useEffect(() => {
  //   fetchRecordData(); // 첫 실행
  //   const interval = setInterval(fetchRecordData, 5000); // 5초마다 실행

  //   return () => clearInterval(interval); // 언마운트 시 정리
  // }, [fetchRecordData]);

  // // Fetch prediction data
  // const fetchPredictionData = useCallback(() => {
  //   if (!id) return;

  //   const endpoint1 = predictionApiMap1[selectedGroup];
  //   const endpoint2 = predictionApiMap2[selectedGroup];

  //   setPredictionData(null);

  //   api
  //     .get(`/api/pemfc/${id}/predictions/${endpoint1}/${endpoint2}`)
  //     .then((response) => {
  //       const arr = response.data;
  //       if (Array.isArray(arr)) {
  //         const processed = arr.map((d: any) => ({
  //           predictedValue: +d.predictedValue,
  //           state: d.state,
  //         }));
  //         setPredictionData(processed);
  //         console.log(`예측 데이터 호출 성공!: /api/pemfc/${id}/predictions/${endpoint1}/${endpoint2}`);
  //       } else {
  //         console.warn("예측 데이터 응답이 배열이 아님:", arr);
  //       }
  //     })
  //     .catch((error) => {
  //       console.error("예측 데이터 호출 실패:", error);
  //     });
  // }, [id, selectedGroup]);

  // useEffect(() => {
  //   fetchPredictionData(); // 최초 실행
  //   const interval = setInterval(fetchPredictionData, 5000);
  //   return () => clearInterval(interval); // cleanup
  // }, [fetchPredictionData]);
  const fetchAllData = useCallback(() => {
    if (!id) return;
  
    const recordRequest = api.get(`/api/pemfc/${id}/record/recent600`);
    const endpoint1 = predictionApiMap1[selectedGroup];
    const endpoint2 = predictionApiMap2[selectedGroup];
    const predictionRequest = api.get(`/api/pemfc/${id}/predictions/${endpoint1}/${endpoint2}`);
  
    Promise.all([recordRequest, predictionRequest])
      .then(([recordRes, predictionRes]) => {
        // 📌 실측 데이터 처리
        const recordArr = recordRes.data;
        if (Array.isArray(recordArr)) {
          setData(recordArr.reverse());
          console.log(`(그래프) 최근 600개 레코드 데이터 호출 성공`);
        } else {
          console.warn("레코드 응답이 배열이 아님:", recordArr);
        }
  
        // 예측 데이터 처리
        const predictionArr = predictionRes.data;
        if (Array.isArray(predictionArr)) {
          const processed = predictionArr.map((d: any) => ({
            predictedValue: +d.predictedValue,
            state: d.state,
          }));
          setPredictionData(processed);
          console.log(`예측 데이터 호출 성공!: /api/pemfc/${id}/predictions/${endpoint1}/${endpoint2}`);
        } else {
          console.warn("예측 응답이 배열이 아님:", predictionArr);
        }
      })
      .catch((error) => {
        console.error("데이터 병렬 호출 실패:", error);
      });
  }, [id, selectedGroup]);

  useEffect(() => {
    fetchAllData(); // 최초 호출
    const interval = setInterval(fetchAllData, 5000); // 5초마다
    return () => clearInterval(interval);
  }, [fetchAllData]);  
// =======
//   if (!id) return;
//   setData(null);

//   api
//     .get(`/api/pemfc/${id}/record/recent600`)
//     .then((response) => {
//       const arr = response.data;
//       if (Array.isArray(arr)) {
//         setData(arr.reverse());
//         console.log(`최근 600개 레코드 데이터 호출 성공!: http://ec2-3-39-41-151.ap-northeast-2.compute.amazonaws.com:8080/api/pemfc/${id}/record/recent600`);
//       } else {
//         console.warn("응답이 배열이 아님:", arr);
//       }
//     })
//     .catch((error) => {
//       console.error("최근 레코드 데이터 호출 실패:", error);
//     });
// }, [id]);

//   // Fetch prediction data
//   useEffect(() => {
//   if (!id) return;

//   const endpoint1 = predictionApiMap1[selectedGroup];
//   const endpoint2 = predictionApiMap2[selectedGroup];

//   setPredictionData(null);

//   api
//     .get(`/api/pemfc/${id}/predictions/${endpoint1}/${endpoint2}`)
//     .then((response) => {
//       const arr = response.data;
//       if (Array.isArray(arr)) {
//         const processed = arr
//           .slice()        // 원본 배열 유지
//           .reverse()      // 역순으로 정렬
//           .map((d: any) => ({
//             predictedValue: +d.predictedValue,
//             state: d.state,
//           }));
//         setPredictionData(processed);
//         console.log(`예측 데이터 호출 성공!: /api/pemfc/${id}/predictions/${endpoint1}/${endpoint2}`);
//       } else {
//         console.warn("예측 데이터 응답이 배열이 아님:", arr);
//       }
//     })
//     .catch((error) => {
//       console.error("예측 데이터 호출 실패:", error);
//     });
// }, [id, selectedGroup]);
// >>>>>>> c36e3a4ee69c66aa69d955ed03a01bd960b7506e

  // Zoom behavior setup
  useEffect(() => {
    if (!svgRef.current || dim.width === 0 || dim.height === 0) return;

    const svg = d3.select(svgRef.current);

    const zoomed = (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      setTransform(event.transform);
    };

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .translateExtent([
        [0, 0],
        [dim.width, dim.height],
      ])
      .extent([
        [0, 0],
        [dim.width, dim.height],
      ])
      .on("zoom", zoomed)
      .filter((event) => !event.button); // prevent right-click zoom

    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, d3.zoomIdentity); // reset zoom on mount

    return () => {
      svg.on(".zoom", null);
    };
  }, [dim]);

  // Helper: 합쳐진 데이터 값 배열 리턴
  const getAllValues = useCallback(() => {
    if (!data) return [];
    const actualValues = data.map((d) => +d[selectedGroup]);
    const predictedValues = predictionData?.map((d) => d.predictedValue) ?? [];
    return actualValues.concat(predictedValues);
  }, [data, predictionData, selectedGroup]);

  // Render chart
  useEffect(() => {
    if (!data || dim.width === 0 || dim.height === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dim.width - margin.left - margin.right;
    const height = dim.height - margin.top - margin.bottom;

    // Define clip path
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    const chartArea = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("clip-path", "url(#clip)");

    const axisArea = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const totalLength = data.length + (predictionData?.length || 0);
    const xBase = d3.scaleLinear().domain([0, totalLength - 1]).range([0, width]);
    const x = transform.rescaleX(xBase);

    const allValues = getAllValues();
    const yDomain = d3.extent(allValues) as [number, number];
    const y = d3.scaleLinear().domain(yDomain).nice().range([height, 0]);

    const defaultTicks = x.ticks(10); // 예: [580, 590, 600, 610, 620]
    const extraTick = 599;
    const allTicks = [...new Set([...defaultTicks, extraTick])];

    // Axes
    axisArea
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .tickSize(-height)
          .tickPadding(10)
          .tickValues(allTicks)
          .tickFormat((d) => {
            const index = d as number;

            if (index === 599) return "현재";
            if (index === 600) return ""; // 0 숨김
            return `${index - 600}`;
          })
        )
      .selectAll("line")
      .attr("stroke", "#ccc")


    axisArea
      .append("g")
      .call(d3.axisLeft(y).tickSize(-width).tickPadding(10))
      .selectAll("line")
      .attr("stroke", "#ccc");

    axisArea.append("text")
      .attr("class", "x label")
      .attr("text-anchor", "end")
      .attr("font-size", 12)
      .attr("font-weight", '500')
      .attr("x", width * 0.5 + 15)
      .attr("y", height + 40) 
      .text("Time");

    axisArea.append("text")
      .attr("class", "y label")
      .attr("text-anchor", "end")
      .attr("x", -150)
      .attr("y", -50)
      .attr("font-size", 12)
      .attr("font-weight", '500')
      .attr("dy", ".75em")
      .attr("transform", "rotate(-90)")
      .text(() => {
        if (selectedGroup === "pw") return "PW";
        if (selectedGroup === "u_totV") return "U_TOTV";
        if (selectedGroup === "t_3") return "T_3";
        return "";
      });


    // Background state bars (actual data)
    const stateLines = data.map((d, i) => ({
      index: i,
      state: d[stateFieldMap[selectedGroup]],
    }));

    chartArea
      .selectAll("line.state")
      .data(stateLines)
      .join("line")
      .attr("x1", (d) => x(d.index))
      .attr("x2", (d) => x(d.index))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", (d) => stateColor(d.state))
      .attr("stroke-width", 1)  
      .attr("stroke-opacity", (d) => (d.state === "WARNING" || d.state === "ERROR" ? 0.6 : 0.15));

    // Actual data line
    const actualValues = data.map((d) => +d[selectedGroup]);
    const line = d3
      .line<number>()
      .x((_, i) => x(i))
      .y((d) => y(d));

    

    // Prediction lines
    if (predictionData?.length) {
       const predStart = data.length;

       chartArea
        .selectAll("line.pred-state")
        .data(predictionData.map((d, i) => ({ index: predStart + i, state: d.state })))
        .join("line")
        .attr("x1", (d) => x(d.index))
        .attr("x2", (d) => x(d.index))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", (d) => stateColor(d.state))
        .attr("stroke-width", 1)  
        .attr("stroke-opacity", (d) => (d.state === "WARNING" || d.state === "ERROR" ? 0.6 : 0.15));

      const predLine = d3
        .line<PredictionPoint>()
        .x((_, i) => x(predStart + i))
        .y((d) => y(d.predictedValue));

      chartArea
        .append("path")
        .datum(predictionData)
        .attr("fill", "none")
        .attr("stroke", "gray")
        .attr("stroke-dasharray", "4 4")
        .attr("stroke-width", 1)
        .attr("d", predLine);

      if (data.length > 0 && predictionData?.length > 0) {
        const lastActualIndex = data.length - 1;
        const firstPredictedIndex = data.length;

        const lastActualValue = +data[lastActualIndex][selectedGroup];
        const firstPredictedValue = predictionData[0].predictedValue;

        chartArea.append("line")
          .attr("x1", x(lastActualIndex))
          .attr("y1", y(lastActualValue))
          .attr("x2", x(firstPredictedIndex))
          .attr("y2", y(firstPredictedValue))
          .attr("fill", "none")
          .attr("stroke", "gray")
          .attr("stroke-dasharray", "4 4")
          .attr("stroke-width", 2);
          
      }
    }
    chartArea
      .append("path")
      .datum(actualValues)
      .attr("fill", "none")
      .attr("stroke", d3.schemeSet2[["pw", "u_totV", "t_3"].indexOf(selectedGroup)])
      .attr("stroke-width", 3)
      .attr("d", line);

    // Focus group: vertical + horizontal line for hover effect
    const focus = chartArea.append("g").style("display", "none");

    const verticalLine = focus
      .append("line")
      .attr("class", "verticalLine")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#666")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "3 3");

    const horizontalLine = focus
      .append("line")
      .attr("class", "horizontalLine")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("stroke", "#666")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3 3");

    // Label group
    const labelGroup = svg.append("g").style("display", "none");

    const xLabel = labelGroup
      .append("text")
      .attr("fill", "#333")
      .attr("font-size", "12px")
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold");

    const yLabel = labelGroup
      .append("text")
      .attr("fill", "#333")
      .attr("font-size", "12px")
      .attr("text-anchor", "end")
      .attr("font-weight", "bold");

    // Transparent rect for mouse events
    chartArea
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {
        focus.style("display", null);
        labelGroup.style("display", null);
      })
      .on("mouseout", () => {
        focus.style("display", "none");
        labelGroup.style("display", "none");
      })
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const x0 = xBase.invert(transform.invertX(mouseX));
        const i = Math.round(x0);

        if (i >= 0 && i < totalLength) {
          const cx = x(i);
          verticalLine.attr("x1", cx).attr("x2", cx);

          let val: number | null = null;
          if (i < data.length) {
            val = +data[i][selectedGroup];
          } else if (predictionData && i - data.length < predictionData.length) {
            val = predictionData[i - data.length].predictedValue;
          }

          if (val !== null) {
            const cy = y(val);
            horizontalLine.attr("y1", cy).attr("y2", cy);

            const adjustedXLabel = i - 599;

            xLabel
              .attr("x", cx + margin.left)
              .attr("y", height + margin.top + 18)
              .attr("font-size", 10)
              .attr("font-weight", 900)
              .text(`${adjustedXLabel}`);

            yLabel
              .attr("x", margin.left - 8)
              .attr("y", margin.top + cy + 4)
              .attr("font-size", 10)
              .attr("font-weight", 900)
              .text(val.toFixed(4));
          }
        }
      });
  }, [data, predictionData, dim, selectedGroup, transform, getAllValues]);

  return (
    <div
      className={styles.lineChartContainer}
      style={{ position: "relative", width: "100%", height: "95%" }}
      ref={containerRef}
    >
      <svg ref={svgRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
