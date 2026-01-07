import { useWindowDimensions, View } from "react-native";
import Svg, { Defs, Line, Pattern, Rect } from "react-native-svg";

export function GridPattern() {
    const { width, height } = useWindowDimensions();
    const gridSize = 16;
    const strokeColor = "rgba(255,255,255,0.03)";
    const strokeWidth = 1;

    return (
        <View
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        >
            <Svg width={width} height={height}>
                <Defs>
                    <Pattern
                        id="gridPattern"
                        width={gridSize}
                        height={gridSize}
                        patternUnits="userSpaceOnUse"
                    >
                        {/* Vertical line */}
                        <Line
                            x1={0}
                            y1={0}
                            x2={0}
                            y2={gridSize}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                        />
                        {/* Horizontal line */}
                        <Line
                            x1={0}
                            y1={0}
                            x2={gridSize}
                            y2={0}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                        />
                    </Pattern>
                </Defs>
                <Rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fill="url(#gridPattern)"
                />
            </Svg>
        </View>
    );
}
