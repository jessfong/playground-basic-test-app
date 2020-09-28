import { Address } from './address';
import { Name } from './name';
import { GeneralPractitioner } from './general-practitioner';
import { Telecom } from './telecom';

export class PatientResource {
    id: string;
    birthDate: string;
    gender: string;
    multipleBirthBoolean: boolean;
    resourceType: string;
    address: Address[];
    name: Name[];
    active: boolean;
    deceasedDateTime: Date;
    telecom: Telecom[];
    generalPractitioner: GeneralPractitioner[];
    martialStatus: string[];

    // Properties defined later
    fullAddress: string[];
    fullName: string[];
    status: string;
    deathStatus: string;
    age: string;
    genPractitioner: string;
    phone: Telecom[];
    email: Telecom[];
    fax: Telecom[];
}
