import { Dialog, Button, LoadingSpinner } from '@neo4j-ndl/react';
import PatternContainer from '../Popups/GraphEnhancementDialog/EnitityExtraction/PatternContainer';

interface SchemaSelectionProps {
    open: boolean,
    onClose: () => void;
    pattern: string[],
    handleRemove: (pattern: string) => void,
    handleSchemaView: (view?: string) => void,
    loading: boolean,
    highlightPattern?: string;
    onApply: ()=>void;
    onCancel:()=>void;
}

const SchemaSelectionDialog = ({ open, onClose, pattern, handleRemove, handleSchemaView, loading, highlightPattern, onApply, onCancel }: SchemaSelectionProps) => {
    return (
        <Dialog
            size='medium'
            isOpen={open}
            onClose={onClose}
            htmlAttributes={{ 'aria-labelledby': 'form-dialog-title' }}
        >
            <Dialog.Header>{'Schema From Database'}</Dialog.Header>
            <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
                {loading ? (
                    <div className='my-40 flex! items-center justify-center'>
                        <LoadingSpinner size='large' />
                    </div>

                ) : (<PatternContainer
                    pattern={pattern}
                    handleRemove={handleRemove}
                    handleSchemaView={handleSchemaView}
                    highlightPattern={highlightPattern ?? ''}
                ></PatternContainer>)}
                <Dialog.Actions className='mt-3'>
                    <Button onClick={onCancel} isDisabled={pattern.length === 0 || loading}>
                        Cancel
                    </Button>
                    <Button onClick={onApply} isDisabled={pattern.length === 0 || loading}>
                        Apply
                    </Button>
                </Dialog.Actions>
            </Dialog.Content>
        </Dialog>
    );
};
export default SchemaSelectionDialog;
