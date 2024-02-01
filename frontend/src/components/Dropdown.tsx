import { Dropdown } from '@neo4j-ndl/react';
import { useState } from 'react';

interface CustomFile extends Partial<globalThis.File> {
    processing: string;
    status: string;
    NodesCount: number;
    id: string;
    relationshipCount: number;
}
export default function LlmDropdown() {
    const [selectedValue, setSelectedValue] = useState<string>('');
    const allOptions = ['OpenAI', 'Spacy', 'Rebel'];
    console.log('selctedValue', selectedValue)
    return (
        <>
            <div style={{width: '150px'}}>
                <Dropdown
                    type="select"
                    selectProps={{
                        onChange: (newValue) => newValue && setSelectedValue(newValue.value),
                        options: allOptions.map((option) => ({ label: option, value: option })),
                        value: { label: selectedValue, value: selectedValue },
                        placeholder:'Select the LLM'
                    }}
                    size='large'
                    fluid
                />
            </div>
        </>
    );
}
