
// import { Checkbox, Dialog, TextArea, Button } from '@neo4j-ndl/react';
// import { useCallback, useState } from 'react';
// import { getNodeLabelsAndRelTypesFromText } from '../../../services/SchemaFromTextAPI';
// import { useCredentials } from '../../../context/UserCredentials';
// import { useFileContext } from '../../../context/UsersFiles';
// import { buttonCaptions } from '../../../utils/Constants';
// import ButtonWithToolTip from '../../UI/ButtonWithToolTip';
// import { showNormalToast, showSuccessToast } from '../../../utils/Toasts';
// import PatternContainer from '../GraphEnhancementDialog/EnitityExtraction/PatternContainer';
// import { OptionType, TupleType } from '../../../types';
// import { updateLocalStorage, extractOptions } from '../../../utils/Utils';
// import SchemaViz from '../../../components/Graph/SchemaViz';

// interface SchemaFromTextProps {
//   open: boolean,
//   onClose: () => void,
//   onApply: (patterns: string[], nodes:OptionType[], rels:OptionType[], view:string) => void
// }

// const SchemaFromTextDialog = ({ open, onClose, onApply }: SchemaFromTextProps) => {
//   const [userText, setUserText] = useState<string>('');
//   const [loading, setLoading] = useState<boolean>(false);
//   const { userCredentials } = useCredentials();
//   const [isSchemaText, setIsSchemaText] = useState<boolean>(false);
//   const { model } = useFileContext();
//   const [textNodeSchema, setTextNodeSchema] = useState<OptionType[]>([]);
//   const [textRelationshipSchema, setTextRelationshipSchema] = useState<OptionType[]>([]);
//   const [schemaPattern, setSchemaPattern] = useState<string[]>([]);
//   const [openGraphView, setOpenGraphView] = useState<boolean>(false);
//   const [viewPoint, setViewPoint] = useState<string>('');

//   // const clickHandler = useCallback(async () => {
//   //   try {
//   //     setIsLoading(true);
//   //     const response = await getNodeLabelsAndRelTypesFromText(model, userText, isSchemaText, false);
//   //     setIsLoading(false);
//   //     if (response.data.status === 'Success') {
//   //       console.log('hello', response.data.data);
//   //       if (response.data?.data) {
//   //         const nodelabels = response.data?.data?.labels?.map((l) => ({ value: l, label: l }));
//   //         setSelectedNodes((prev) => {
//   //           const combinedData = [...prev, ...nodelabels];
//   //           const uniqueLabels = new Set();
//   //           const updatedOptions = combinedData.filter((item) => {
//   //             if (!uniqueLabels.has(item.label)) {
//   //               uniqueLabels.add(item.label);
//   //               return true;
//   //             }
//   //             return false;
//   //           });
//   //           localStorage.setItem(
//   //             'selectedNodeLabels',
//   //             JSON.stringify({ db: userCredentials?.uri, selectedOptions: updatedOptions })
//   //           );
//   //           return updatedOptions;
//   //         });
//   //       }
//   //       if (response.data?.data?.relationshipTypes.length) {
//   //         const reltypes = response.data?.data?.relationshipTypes.map((t) => ({ value: t, label: t }));
//   //         setSelectedRels((prev) => {
//   //           const combinedData = [...prev, ...reltypes];
//   //           const uniqueLabels = new Set();
//   //           const updatedOptions = combinedData.filter((item) => {
//   //             if (!uniqueLabels.has(item.label)) {
//   //               uniqueLabels.add(item.label);
//   //               return true;
//   //             }
//   //             return false;
//   //           });
//   //           localStorage.setItem(
//   //             'selectedRelationshipLabels',
//   //             JSON.stringify({ db: userCredentials?.uri, selectedOptions: updatedOptions })
//   //           );
//   //           return updatedOptions;
//   //         });
//   //       }
//   //       if (response.data?.data?.relationshipTypes.length && response.data?.data?.labels.length) {
//   //         showSuccessToast(
//   //           `Successfully Created ${response.data?.data?.labels.length} Node labels and ${response.data?.data?.relationshipTypes.length} Relationship labels`
//   //         );
//   //       } else if (response.data?.data?.relationshipTypes.length && !response.data?.data?.labels.length) {
//   //         showSuccessToast(`Successfully Created ${response.data?.data?.relationshipTypes.length} Relationship labels`);
//   //       } else if (!response.data?.data?.relationshipTypes.length && response.data?.data?.labels.length) {
//   //         showSuccessToast(`Successfully Created ${response.data?.data?.labels.length} Node labels`);
//   //       } else {
//   //         showNormalToast(`Please give meaningful text`);
//   //       }
//   //     } else {
//   //       throw new Error('Unable to create labels from ');
//   //     }
//   //     onClose();
//   //     setUserText('');
//   //     setIsSchemaText(false);
//   //   } catch (error) {
//   //     setIsLoading(false);
//   //     console.log(error);
//   //   }
//   // }, [userCredentials, userText, isSchemaText]);

//   const clickHandler = useCallback(async () => {
//     setLoading(true);
//     try {
//       const response = await getNodeLabelsAndRelTypesFromText(model, userText, isSchemaText, false);
//       setLoading(false);
//       if (response.data.status === 'Success' && response.data?.data?.triplets?.length) {
//         const schemaData: string[] = response.data.data.triplets;
//         const schemaTuples: TupleType[] = schemaData.map((item: string) => {
//           const matchResult = item.match(/^(.+?)-([A-Z_]+)->(.+)$/);
//           if (matchResult) {
//             const [source, rel, target] = matchResult.slice(1).map((s) => s.trim());
//             return {
//               value: `${source},${rel},${target}`,
//               label: `${source} -[:${rel}]-> ${target}`,
//               source,
//               target,
//               type: rel,
//             };
//           }
//           return null;
//         })
//           .filter(Boolean) as TupleType[];
//         const { nodeLabelOptions, relationshipTypeOptions } = extractOptions(schemaTuples);
//         setTextNodeSchema(nodeLabelOptions);
//         setTextRelationshipSchema(relationshipTypeOptions);
//         setSchemaPattern(schemaTuples.map(t => t.label));
//         if (nodeLabelOptions.length && relationshipTypeOptions.length) {
//           showSuccessToast(
//             `Successfully Created ${nodeLabelOptions.length} Node labels and ${relationshipTypeOptions.length} Relationship labels`
//           );
//         } else {
//           showNormalToast(`Please provide meaningful text.`);
//         }
//       } else {
//         showNormalToast(`Please provide meaningful text.`);
//       }
//     } catch (error) {
//       setLoading(false);
//       console.error('Error processing schema:', error);
//     }
//   }, [userCredentials, userText, isSchemaText]);

//   const handleRemovePattern = (pattern: string) => {
//     setSchemaPattern((prevPatterns) => prevPatterns.filter((p) => p !== pattern));
//   };

//   const handleSchemaView = () => {
//     setOpenGraphView(true);
//     setViewPoint('showSchemaView');
//   };

//   const handleSchemaTextApply = () => {
//     if (onApply) {
//       onApply(schemaPattern, textNodeSchema, textRelationshipSchema, 'text');
//     }
//     onClose();
//   };

//   const handleCancel = () => {
//     setTextNodeSchema([]);
//     setTextRelationshipSchema([]);
//     setSchemaPattern([]);
//     setUserText('');
//     setIsSchemaText(false);
//     onClose();
//   };

//   return (
//     <>
//       <Dialog
//         size='medium'
//         isOpen={open}
//         onClose={() => {
//           setLoading(false);
//           setIsSchemaText(false);
//           setUserText('');
//           onClose();
//         }}
//         htmlAttributes={{
//           'aria-labelledby': 'form-dialog-title',
//         }}
//       >
//         <Dialog.Header>Entity Graph Extraction Settings</Dialog.Header>
//         <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
//           <TextArea
//             helpText='Analyze the text to extract Entities'
//             label='Document Text'
//             style={{
//               resize: 'vertical',
//             }}
//             isFluid={true}
//             value={userText}
//             htmlAttributes={{
//               onChange: (e) => setUserText(e.target.value),
//             }}
//             size='large'
//           />
//           <div className='flex justify-between mt-4'>
//             <Checkbox
//               label="Text is schema description"
//               onChange={(e) => {
//                 setIsSchemaText(e.target.checked);
//               }}
//               isChecked={isSchemaText}
//             />
//             <ButtonWithToolTip
//               placement='top'
//               label='Analyze button'
//               text={userText.trim() === '' ? 'please fill the text to extract graph schema' : 'Analyze text for schema'}
//               loading={loading}
//               disabled={userText.trim() === '' || loading}
//               onClick={clickHandler}
//             >
//               {buttonCaptions.analyze}
//             </ButtonWithToolTip>
//           </div>
//           {schemaPattern.length > 0 && (
//             <>
//               <div className="mt-6">
//                 <PatternContainer
//                   pattern={schemaPattern}
//                   handleRemove={handleRemovePattern}
//                   handleSchemaView={handleSchemaView}
//                   nodes={textNodeSchema}
//                   rels={textRelationshipSchema}
//                 />
//               </div>
//               <Dialog.Actions className='mt-3'>
//                 <Button onClick={handleCancel} isDisabled={schemaPattern.length === 0}>
//                   Cancel
//                 </Button>
//                 <Button onClick={handleSchemaTextApply} isDisabled={schemaPattern.length === 0}>
//                   Apply
//                 </Button>
//               </Dialog.Actions>
//             </>
//           )}
//         </Dialog.Content>
//       </Dialog>
//       {openGraphView && (
//         <SchemaViz
//           open={openGraphView}
//           setGraphViewOpen={setOpenGraphView}
//           viewPoint={viewPoint}
//           nodeValues={(textNodeSchema as OptionType[]) ?? []}
//           relationshipValues={(textRelationshipSchema) ?? []}
//         />
//       )}
//     </>
//   );

// };
// export default SchemaFromTextDialog;
