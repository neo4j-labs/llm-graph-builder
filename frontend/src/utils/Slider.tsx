import React from 'react';
import { Slider } from '@neo4j-ndl/react';
import { GraphType } from '../types';
interface SliderProps {
  loading: boolean;
  graphType?: GraphType[];
  handleChange: (value: number) => void;
  sliderValue: number;
}
const SliderSelection: React.FC<SliderProps> = ({ loading, handleChange, sliderValue }) => {
  return (
    <div className='flex flex-col mt-2'>
      <span className='n-body-small ml-1'>Chunk Limit:</span>
      <div className='flex gap-5 justify-between'>
        <Slider
          minValue={0}
          maxValue={200}
          isDisabled={loading}
          step={10}
          value={sliderValue}
          showSteps={false}
          showValues={true}
          type='single'
          onChange={handleChange}
        />
      </div>
    </div>
  );
};
export default SliderSelection;
