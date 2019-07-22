import { NgModule } from '@angular/core';
import { IonicModule } from 'ionic-angular';

import { SignatureComponent } from './signature-component';
import { SignatureZoomComponentModal } from './zoom/signature-zoom-component';
import { IonicPageModule } from 'ionic-angular';
import { SignaturePadModule } from 'angular2-signaturepad';

@NgModule({
  declarations: [
    SignatureComponent,
    SignatureZoomComponentModal
  ],
  imports: [
    IonicModule,
    SignaturePadModule,
    IonicPageModule.forChild(SignatureZoomComponentModal),
  ],
  exports: [
    SignatureComponent,
    SignatureZoomComponentModal
  ]
})
export class SignatureComponentModule { }
