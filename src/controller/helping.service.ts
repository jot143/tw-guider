import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, ɵDomSanitizerImpl } from '@angular/platform-browser';
import { HttpClient as CustomHttpClient } from '../services/http-client';
import { HttpClient, HttpHeaders as Headers } from '@angular/common/http';
import { SecurityContext } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HelpingService {

  constructor(
    private domSanitizer: DomSanitizer,
    private httpCustom: CustomHttpClient, 
    protected sanitizerImpl: ɵDomSanitizerImpl,
    private http: HttpClient) { }
  
  getSecureFile(url, blob = false) {
    return new Promise((resolve, reject) => {
      if(typeof url != 'string' ) {
        resolve(false);
      }
  
      if (url.includes('/api/api/')) {
        url = url.replace('/api/api/', '/api/');
      }
  
      const headerObject: any = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };
      if (this.httpCustom.getAuthorizationToken()) {
        headerObject['X-Auth-Token'] = this.httpCustom.getAuthorizationToken();
      }
  
      const headers = new Headers(headerObject);
  
      this.http.get(url, { headers: headers, observe: 'response', responseType: 'blob' }).toPromise()
        .then((response) => {
          console.log(response);
          if(blob === false) {
             resolve(response.url);
          } else {
            var urlCreator = window.URL || window.webkitURL; 
            resolve(this.getSafeUrl(urlCreator.createObjectURL(response.body))); 
          }
        })
        .catch((downloadErr) => {
          console.log('downloadErr', downloadErr);
          resolve(false);
        });
    });
  }

  public getSafeUrl(convertFileSrc, sanitizeType = 'trustResourceUrl'): SafeResourceUrl {
    const safeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(convertFileSrc);

    if (sanitizeType === 'trustStyle') {
      return this.sanitizerImpl.sanitize(SecurityContext.RESOURCE_URL, safeUrl);
    }

    return safeUrl;
  }
}
