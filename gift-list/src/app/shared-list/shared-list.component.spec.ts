import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SharedListComponent } from './shared-list.component';
import { SharedListService } from '../services/shared-list.service';

describe('SharedListComponent', () => {
  let fixture: ComponentFixture<SharedListComponent>;

  beforeEach(async () => {
    const service = jasmine.createSpyObj<SharedListService>('SharedListService', ['getSharedList']);
    service.getSharedList.and.returnValue(of({
      slug: 'lea-30-ans',
      title: 'Les cadeaux de Léa',
      occasion: 'Anniversaire',
      gifts: [
        {
          name: 'Appareil photo instantané',
          description: 'Pour garder les souvenirs sur papier.',
          reason: 'Léa aime documenter les bons moments.',
          budgetLabel: '80 à 120 €',
          productUrl: 'https://example.com/photo',
          imageUrl: 'https://example.com/photo.jpg'
        }
      ]
    }));

    await TestBed.configureTestingModule({
      imports: [SharedListComponent],
      providers: [
        provideRouter([]),
        { provide: SharedListService, useValue: service },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: 'lea-30-ans' })) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SharedListComponent);
    fixture.detectChanges();
  });

  it('affiche les cadeaux avant tout appel à créer une autre liste', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.shared-intro h1')?.textContent).toContain('Les cadeaux de Léa');
    expect(compiled.querySelector('.public-gift h2')?.textContent).toContain('Appareil photo instantané');
    expect(compiled.querySelector<HTMLAnchorElement>('.public-gift__link')?.href).toBe('https://example.com/photo');
  });

  it('remplace une image cassée par le fallback de la carte', () => {
    fixture.componentInstance.markImageAsFailed(0);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.gift-fallback')).toBeTruthy();
  });
});
