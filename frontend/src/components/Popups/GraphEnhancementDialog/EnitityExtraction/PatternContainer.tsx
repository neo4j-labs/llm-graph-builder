import {Tag } from '@neo4j-ndl/react';
import { appLabels, tooltips } from '../../../../utils/Constants';
import ButtonWithToolTip from '../../../UI/ButtonWithToolTip';
import { ExploreIcon } from '@neo4j-ndl/react/icons';

interface PatternContainerProps {
    pattern: string[],
    handleRemove: (pattern: string) => void,
    handleSchemaView: (view?: string) => void,
    highlightPattern?:string
}


const PatternContainer = ({pattern, handleRemove, handleSchemaView, highlightPattern}: PatternContainerProps) => {
    return (
        // <div className='h-full'>
        //     <div className='flex align-self-center justify-center border'>
        //         <h5>{appLabels.selectedPatterns}</h5>
        //     </div>
        //     <div className='flex items-start gap-4 mt-4'>
        //         <div className='flex flex-wrap gap-2 patternContainer'>
        //             {pattern.map((pattern) => (
        //                 <Tag
        //                     key={pattern}
        //                     onRemove={() => handleRemove(pattern)}
        //                     isRemovable={true}
        //                     type='default'
        //                     size='medium'
        //                     className={`rounded-full px-4 py-1 shadow-sm transition-all duration-300 ${pattern === highlightPattern ? 'animate-highlight' : ''
        //                         }`}
        //                 >
        //                     {pattern}
        //                 </Tag>
        //             ))}
        //         </div>
        //         <div className='flex-shrink-0 items-end m-auto'>
        //             <ButtonWithToolTip
        //                 label={'Graph Schema'}
        //                 text={tooltips.visualizeGraph}
        //                 placement='top'
        //                 fill='outlined'
        //                 onClick={handleSchemaView}
        //                 className='ml-4'
        //             >
        //                 <Hierarchy1Icon />
        //             </ButtonWithToolTip>
        //         </div>
        //     </div>
        // </div>
     <div className="h-full">
            <div className="flex align-self-center justify-center border">
                <h5>{appLabels.selectedPatterns}</h5>
            </div>
            <div className="flex flex-col gap-4 mt-4">
                <div className="relative patternContainer border p-4 rounded-md shadow-sm">
                    <div className="sticky top-0 right-0 flex justify-end z-10 ">
                        <ButtonWithToolTip
                            label={'Graph Schema'}
                            text={tooltips.visualizeGraph}
                            placement="top"
                            fill="outlined"
                            onClick={handleSchemaView}
                        >
                            <ExploreIcon className='n-size-token-7'/>
                        </ButtonWithToolTip>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {pattern.map((pattern) => (
                            <Tag
                                key={pattern}
                                onRemove={() => handleRemove(pattern)}
                                isRemovable={true}
                                type="default"
                                size="medium"
                                className={`rounded-full px-4 py-1 shadow-sm transition-all duration-300 ${pattern === highlightPattern ? 'animate-highlight' : ''
                                    }`}
                            >
                                {pattern}
                            </Tag>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PatternContainer;