import operationsData from "../assets/operations-data.json";

interface OperationDefinition {
  id: string;
  name: string;
}

const NAME_BY_ID = new Map((operationsData as OperationDefinition[]).map((op) => [op.id, op.name]));

export function operationName(id: string): string | undefined {
  return NAME_BY_ID.get(id);
}
