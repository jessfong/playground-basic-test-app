import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { ApiService } from '../app/services/api-service.service';
import { MatTableDataSource } from '@angular/material/table';
import { Patient } from './shared/models/patient';
import { map } from 'rxjs/operators';
import { MatSort } from '@angular/material/sort';
import { PatientResource } from './shared/models/patient-resource';
import { trigger, state, transition, style, animate } from '@angular/animations';
import differenceInYears from 'date-fns/differenceInYears';
import { parseISO } from 'date-fns';
import { Telecom } from './shared/models/telecom';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { PatientData } from './shared/models/patient-data';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

export const DATE_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'YYYY-MM-DD',
    monthYearLabel: 'YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'YYYY',
  }
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },

    { provide: MAT_DATE_FORMATS, useValue: DATE_FORMATS },
  ]
})

export class AppComponent implements OnInit, AfterViewInit {
  title = 'fhir-app-test';
  expandedElement: any;
  isSearching = true;
  dataSource = new MatTableDataSource<PatientResource>();
  displayedColumns = ['photo', 'name', 'gender', 'age', 'birthDate', 'status', 'generalPractitioner',
    'deathDate', 'maritalStatus', 'phone', 'email', 'fax', 'address'];
  responseTime = 0;
  isExpansionDetailRow: any;
  searchForm: FormGroup;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private apiService: ApiService,
    private formBuilder: FormBuilder
  ) { }

  /**
   * Looks up patient data
   */
  lookUpPatientData(): void {
    const start = performance.now();

    this.apiService.getPatients().pipe(map(data => {
      return this.handleData(start, data);
    })).subscribe((data: PatientResource[]) => {
      this.dataSource.data = data;
      this.isSearching = false;
    });
  }

  /**
   * on init
   */
  ngOnInit(): void {
    this.isExpansionDetailRow = (i: number, row: any) => row.hasOwnProperty('detailRow');
    this.searchForm = this.formBuilder.group({
      name: ['', Validators.pattern('^[a-zA-Z ]*$')],
      birthDate: ['']
    });
    this.lookUpPatientData();
  }

  /**
   * after view init
   */
  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  /**
   * Determines whether submit on
   */
  onSubmit(): void {
    if (!this.searchForm.valid) {
      return;
    }

    this.isSearching = true;

    const name = this.searchForm.get('name').value;
    const birthDate = this.searchForm.get('birthDate').value;
    const start = performance.now();

    this.apiService.getSearchPatient(name, birthDate).pipe(map(data => {
      return this.handleData(start, data);
    })).subscribe((data: PatientResource[]) => {
      this.isSearching = false;
      this.dataSource.data = data;
    });
  }

  /**
   * Handles incoming patient data
   * @param start - start of request in milliseconds
   * @param data - retrieved patient data
   * @returns data - parsed patient resources
   */
  handleData(start: number, data: PatientData): PatientResource[] {
    const end = performance.now();
    this.responseTime = end - start;

    if (!data.entry) {
      return [];
    }

    for (const patient of data.entry) {
      patient.resource.status = this.getStatus(patient);
      patient.resource.genPractitioner = this.getPractitioner(patient);
      patient.resource.fullName = this.getName(patient);
      patient.resource.fullAddress = this.getAddress(patient);
      patient.resource.age = this.getAge(patient);
      patient.resource.phone = this.getPhoneNumbers(patient);
      patient.resource.email = this.getEmails(patient);
      patient.resource.fax = this.getFaxes(patient);
      patient.resource.photoUrl = this.getPhotoUrl(patient);
    }

    return data.entry.map(e => e.resource);
  }

  /**
   * Get status of patient record
   * @param patient - retrieved patient
   * @returns status - current status of patient's record
   */
  getStatus(patient: Patient): string {
    if (patient.resource.active) {
      return 'Active';
    } else if (patient.resource.active === false) {
      return 'Inactive';
    }
    return 'N/A';
  }

  /**
   * Gets practitioner
   * @param patient - retrieved patient
   * @returns practitioner - patient's general practitioner
   */
  getPractitioner(patient: Patient): string {
    if (!patient.resource.generalPractitioner) {
      return '';
    }

    const allPractitioners = [];
    for (const practitioner of patient.resource.generalPractitioner) {
      allPractitioners.push(practitioner.display);
    }

    return allPractitioners.join(' <br> ');
  }

  /**
   * Gets name
   * @param patient - retrieved patient
   * @returns name - every listed name for current patient
   */
  getName(patient: Patient): string[] {
    if (!patient.resource.name) {
      return [];
    }

    const fullName = [];
    for (const name of patient.resource.name) {
      const prefix = Array.isArray(name.prefix) ? name.prefix : [name.prefix];
      const family = Array.isArray(name.family) ? name.family : [name.family];
      const use = Array.isArray(name.use) ? name.use : [name.use];
      const given = Array.isArray(name.given) ? name.given : [name.given];

      fullName.push([
        prefix.map(p => ((p) ? p : '').trim()).join(' '),
        given.map(n => ((n) ? n : '').trim()).join(' '),
        family.map(f => ((f) ? f : '').trim()).join(' '),
        use.map(u => ((u) ? u : '').trim()).join(' ')
      ].filter(Boolean).join(' '));
    }

    return fullName;
  }

  /**
   * Gets all of patient's address(s)
   * @param patient - retrieved patient
   * @returns address - every listed address for current patient
   */
  getAddress(patient: Patient): string[] {
    if (!patient.resource.address) {
      return [];
    }

    const allAddress = [];
    for (const address of patient.resource.address) {
      const city = [address.city];
      const district = [address.district];
      const addressState = [address.state];
      const postalCode = [address.postalCode];
      const country = [address.country];

      allAddress.push([address.line, city, district, addressState, postalCode, country]
        .map(a => String(a || '').trim())
        .filter(Boolean)
        .join(' '));
    }

    return allAddress;
  }

  /**
   * Gets phone numbers
   * @param patient - retrieved patient
   * @returns phone numbers - every listed phone number for current patient
   */
  getPhoneNumbers(patient: Patient): Telecom[] {
    if (!patient.resource.telecom) {
      return [];
    }

    const phoneNumbers = patient.resource.telecom.filter(p => p.system === 'phone');
    return phoneNumbers;
  }

  /**
   * Gets emails
   * @param patient - retrieved patient
   * @returns emails - every listed email for current patient
   */
  getEmails(patient: Patient): Telecom[] {
    if (!patient.resource.telecom) {
      return [];
    }

    const emails = patient.resource.telecom.filter(p => p.system === 'email');
    return emails;
  }

  /**
   * Gets faxes
   * @param patient - retrieved patient
   * @returns faxes - every listed email for current patient
   */
  getFaxes(patient: Patient): Telecom[] {
    if (!patient.resource.telecom) {
      return [];
    }

    const faxes = patient.resource.telecom.filter(p => p.system === 'fax');
    return faxes;
  }

  /**
   * Gets age
   * @param patient - retrieved patient
   * @returns age - patient's age
   */
  getAge(patient: Patient): string {
    if (!patient.resource.birthDate) {
      return 'N/A';
    }

    return differenceInYears(Date.now(), parseISO(patient.resource.birthDate)).toString();
  }

  /**
   * Determines whether search is valid
   * @returns true if valid search
   */
  isValidSearch(): boolean {
    const name = this.searchForm.get('name').value;
    const birthDate = this.searchForm.get('birthDate').value;

    return this.searchForm.valid && !this.isSearching && (name || birthDate);
  }

  /**
   * Gets patient photo
   * @param patient - retrieved patient
   * @returns photo url
   */
  getPhotoUrl(patient: Patient): string  {
    if (patient.resource?.photo?.url) {
      return patient.resource.photo.url;
    }

    if (patient.resource?.photo?.data) {
      return patient.resource.photo.data;
    }

    return 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png';
  }
}
