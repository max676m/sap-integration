// ============================
// Field Registry
// ============================
// Static field definitions per stage.
// To add new fields, simply append entries to the `fields` array.

export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  example: string;
}

export interface StageFields {
  stage: string;
  description: string;
  fields: FieldDefinition[];
}

export const FIELD_REGISTRY: Record<string, StageFields> = {
  MATERIAL_SEARCH: {
    stage: 'MATERIAL_SEARCH',
    description: 'Fields for SAP Material Master search',
    fields: [
      {
        key: 'productName',
        label: 'Product Name',
        required: true,
        example: 'Pepsi Zero Sugar',
      },
      {
        key: 'size',
        label: 'Size/Volume',
        required: true,
        example: '330ml',
      },
      {
        key: 'packagingType',
        label: 'Packaging Type',
        required: false,
        example: 'glass bottle',
      },
      {
        key: 'plantLocation',
        label: 'Plant Location',
        required: true,
        example: 'Jeddah Mega Plant',
      },
      {
        key: 'productCategory',
        label: 'Product Category',
        required: false,
        example: 'Carbonated Soft Drink',
      },
    ],
  },
  BOM_SEARCH: {
    stage: 'BOM_SEARCH',
    description: 'Fields for BOM search — TBD',
    fields: [],
  },
  RECIPE_SEARCH: {
    stage: 'RECIPE_SEARCH',
    description: 'Fields for Recipe search — TBD',
    fields: [],
  },
};

/**
 * Returns the field definitions for a given stage.
 */
export function getFieldsForStage(stage: string): FieldDefinition[] {
  return FIELD_REGISTRY[stage]?.fields ?? [];
}

/**
 * Returns only the required field keys for a given stage.
 */
export function getRequiredFieldKeys(stage: string): string[] {
  return getFieldsForStage(stage)
    .filter((f) => f.required)
    .map((f) => f.key);
}
