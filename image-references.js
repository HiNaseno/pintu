const imageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const invalidReference = () => Object.assign(new Error('参考图片编号无效、重复或不属于本任务，请重新确认方案'), {status: 400});
export const LEGACY_REFERENCE_POLICY_VERSION = 2;

// Inputs contain extracted document images as well as uploads. Raw documents and
// sourceDocuments are never image attachments; the material reader has already
// decoded the supported image formats before placing them in job.inputs.
export function selectGenerationReferences(job, output) {
  if (job.workflowVersion === 2) {
    return (output.referenceIds || []).map(id => {
      const input = job.inputs.find(item => item.referenceId === id);
      if (!input) throw new Error('已确认参考图无法读取，请重新提交素材');
      return input;
    });
  }
  if (job.fields.mode === 'logo' || output.visual?.presence === 'none') return [];
  const available = (job.inputs || []).filter(input => imageMimeTypes.has(input.mimetype));
  if (output.referenceIds === undefined || output.referenceIds === null) return available;
  const ids = output.referenceIds;
  if (!Array.isArray(ids) || ids.length > 12 || new Set(ids).size !== ids.length) throw invalidReference();
  return ids.map(id => {
    const input = typeof id === 'string' && available.find(item => item.referenceId === id);
    if (!input) throw invalidReference();
    return input;
  });
}

export function legacyReferenceDirective(inputs) {
  if (!inputs.length) return '';
  return `【本次实际参考附件及顺序】
${inputs.map((input, index) => `${index + 1}. 来源名称 ${JSON.stringify(input.sourceName || input.originalname || `参考图${index + 1}`)}；编号 ${input.referenceId || '旧素材'}；来源类型 ${input.sourceKind || 'upload'}；页码或图序 ${input.ordinal || 1}。`).join('\n')}
本图已提供以上 ${inputs.length} 张图片，请先检查全部附件，再按本张画面要求选择商品、款式、角度和场景依据；不能因为第 1 张排在前面就忽略后续图片。多款陈列使用相应附件中已经出现的真实款式，不把不同款式拼成同一商品，不凭空补造缺失外观。`;
}

// Previously compiled legacy prompts implicitly froze only the first image.
// Reconfirm them explicitly rather than silently expanding frozen attachments.
export function legacyReferencesNeedReconfirmation(job, candidate) {
  if (!candidate || job.workflowVersion === 2 || candidate.referencePolicyVersion === LEGACY_REFERENCE_POLICY_VERSION) return false;
  return job.analysis.outputs.some(output => output.referenceIds == null && selectGenerationReferences(job, output).length > 1);
}
