import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AbpHeaderInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.headers.has('abp.tenantid')) {
      const modifiedHeaders = req.headers
        .delete('abp.tenantid')
        .set('abp-tenantid', req.headers.get('abp.tenantid')!);

      const modifiedRequest = req.clone({ headers: modifiedHeaders });
      return next.handle(modifiedRequest);
    }
    return next.handle(req);
  }
}
