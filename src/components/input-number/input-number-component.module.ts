import { NgModule } from '@angular/core';
import { IonicModule } from 'ionic-angular';

import { InputNumberComponent } from './input-number-component';

@NgModule({
  declarations: [
    InputNumberComponent,
  ],
  imports: [
    IonicModule,
  ],
  exports: [
    InputNumberComponent,
  ]
})
export class InputNumberComponentModule { }
