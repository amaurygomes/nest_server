import { ExternalAccountDto } from './external-account.dto';

export class MachineApiResponse {
  success: boolean;
  response?: ExternalAccountDto[] | undefined;
}
