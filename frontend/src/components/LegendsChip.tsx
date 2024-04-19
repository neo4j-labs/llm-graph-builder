import { LegendChipProps } from "../types"
import { colors } from "../utils/Constants";

export const LegendsChip: React.FunctionComponent<LegendChipProps> = ({ scheme, title }) => {
    const count = Object.keys(scheme).filter((nodeTitle) => nodeTitle === title);
    const showCount = Object.keys(scheme).length <= colors.length;
    return (
        <div className='legend' key={scheme.key} style={{ backgroundColor: `${scheme[title]}` }}>
            {title}{showCount && count.length}
        </div>
    )
}