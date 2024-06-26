import { SegmentedControl } from '@neo4j-ndl/react';
import { useState } from 'react'
import { DbmsIcon ,VisualizeBloomIcon } from '@neo4j-ndl/react/icons';

export default function ChatModeToggle({inSidenav=false}) {
  const options = [{Icon:VisualizeBloomIcon,value:'graph'}, {Icon:DbmsIcon,value:'vector'}]
  const [mode, setmode] = useState<string>("graph")
  return (
    <SegmentedControl className={inSidenav?'flex-col !h-full !ml-1':''} onChange={setmode} hasOnlyIcons={true} selected={mode} size={inSidenav?"large":'small'}>
      {options.map((i,idx) => <SegmentedControl.Item  key={`${idx}`} value={i.value}>{<i.Icon className="n-size-token-7"/>}</SegmentedControl.Item>)}
    </SegmentedControl>
  )
}
