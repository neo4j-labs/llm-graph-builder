import { SegmentedControl } from '@neo4j-ndl/react';
import { useState } from 'react'

export default function ChatModeToggle({inSidenav=false}) {
  const options = ["a", "b", "c"]
  const [mode, setmode] = useState<string>("graph")
  return (
    <SegmentedControl className={inSidenav?'flex-col !h-full !ml-3':''} onChange={setmode} hasOnlyIcons={false} selected={mode} size="small">
      {options.map((i,idx) => <SegmentedControl.Item  key={`${idx}${i}`} value={i}>{i}</SegmentedControl.Item>)}
    </SegmentedControl>
  )
}
