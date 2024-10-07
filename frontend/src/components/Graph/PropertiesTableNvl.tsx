import { GraphLabel, Typography } from '@neo4j-ndl/react';
import { useState } from 'react';

// import { ClipboardCopier } from '../clipboard-copier/clipboard-copier';
// import { ClickableUrls } from './clickable-urls';

export const ELLIPSIS = '\u2026';
export const WIDE_VIEW_THRESHOLD = 900;
export const MAX_LENGTH_NARROW = 150;
export const MAX_LENGTH_WIDE = 300;
type ExpandableValueProps = {
    value: string;
    width: number;
    type: string;
};
function ExpandableValue({ value, width, type }: ExpandableValueProps) {
    const [expanded, setExpanded] = useState(false);

    const maxLength = width > WIDE_VIEW_THRESHOLD ? MAX_LENGTH_WIDE : MAX_LENGTH_NARROW;

    const handleExpandClick = () => {
        setExpanded(true);
    };

    let valueShown = expanded ? value : value.slice(0, maxLength);
    const valueIsTrimmed = valueShown.length !== value.length;
    valueShown += valueIsTrimmed ? ELLIPSIS : '';

    return (
        <>
            {type.startsWith('Array') && '['}
            {/* <ClickableUrls text={valueShown} /> */}
            {valueIsTrimmed && (
                <button onClick={handleExpandClick} className="text-palette-primary-text">
                    {' Show all'}
                </button>
            )}
            {type.startsWith('Array') && ']'}
        </>
    );
}

type PropertiesTableNvlProps = {
    propertiesWithTypes: {
        key: string;
        type: string;
        value: string;
    }[];
    paneWidth: number;
};
export const PropertiesTableNvl = ({ propertiesWithTypes, paneWidth }: PropertiesTableNvlProps): JSX.Element => {
    return (
        <div className="flex w-full flex-col break-all px-4 text-sm" data-testid="viz-details-pane-properties-table">
            <div className="mb-1 flex flex-row pl-2">
                <Typography variant="body-medium" className="basis-1/3">
                    Key
                </Typography>
                <Typography variant="body-medium">Value</Typography>
            </div>
            {propertiesWithTypes.map(({ key, type, value }, _) => {
                return (
                    <div
                        key={key}
                        title={type}
                        className="border-palette-neutral-border-weak flex border-t py-1 pl-2 first:border-none"
                    >
                        <div className="shrink basis-1/3 overflow-hidden whitespace-nowrap">
                            <GraphLabel
                                type="propertyKey"
                                tabIndex={-1}
                                className="pointer-events-none !max-w-full overflow-ellipsis"
                            >
                                {key}
                            </GraphLabel>
                        </div>
                        <div className={`ml-2 flex-1 whitespace-pre-wrap`}>
                            <ExpandableValue value={value} width={paneWidth} type={type} />
                        </div>
                        {/* <div className={`flex justify-end`}>
              <ClipboardCopier
                ariaLabel="Copy property key and value"
                title={'Copy key and value'}
                textToCopy={`${key}: ${value}`}
                iconButtonSize="small"
              />
            </div> */}
                    </div>
                );
            })}
        </div>
    );
};