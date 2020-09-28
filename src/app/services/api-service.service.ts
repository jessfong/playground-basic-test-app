import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { PatientData } from '../shared/models/patient-data';
import format from 'date-fns/format';

@Injectable({
  providedIn: 'root'
})

export class ApiService {

  constructor(private httpClient: HttpClient) { }

  /**
   * Gets patients
   * @returns patients - retrieved patients
   */
  getPatients(): Observable<PatientData> {
    return this.httpClient.get<PatientData>(environment.queryURI + '/Patient',
      { headers: this.getHeaders() });
  }

  /**
   * Gets patients birthed between two dates (inclusive)
   * @param [from] - from date
   * @param [to] - to date
   * @returns - data for patients born between two dates
   */
  getPatientsByBirthRange(from: string = 'ge1960-01-01', to: string = 'le1965-01-01') {
    return this.httpClient.get<PatientData>(environment.queryURI + '/Patient',
      {
        headers: this.getHeaders(),
        params: {
          birthdate: [from, to]
        }
      });
  }

  /**
   * Gets searched patient
   * @param [patientName] - name of patient
   * @param [birthDateMoment] - date of patient's birth
   * @returns - data for patients that match the searched results
   */
  getSearchPatient(patientName?: string, birthDateMoment?: any) {
    let parameters;
    if (patientName && birthDateMoment) {
      parameters = {
        name: patientName,
        birthdate: format(birthDateMoment.toDate(), 'yyyy-MM-dd')
      };
    } else if (patientName && !birthDateMoment) {
      parameters = {
        name: patientName
      };
    } else if (!patientName && birthDateMoment) {
      parameters = {
        birthdate: format(birthDateMoment.toDate(), 'yyyy-MM-dd')
      };
    }

    return this.httpClient.get<PatientData>(environment.queryURI + '/Patient',
      {
        headers: this.getHeaders(),
        params: parameters
      });
  }

  /**
   * Gets headers
   * @returns headers - application headers
   */
  private getHeaders(): HttpHeaders {
    const headers = new HttpHeaders({
      'Content-Type': 'application/fhir+json'
    });

    return headers;
  }
}


