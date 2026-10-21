// engine/tajweedRuleDetails.js
// تفاصيل إضافية لكل حكم (مفاتيح ترجمة في core/i18n.js بالعربية والإنجليزية) مأخوذة بإعادة صياغة
// من كتاب «تحفة الأطفال بطريقة ممتعة» (إعداد محمد جعفر). ⚠️ تستحق مراجعة المعلم قبل الاعتماد،
// خصوصاً مقادير المد والمسائل الخلافية بين الروايات.
export const TAJWEED_RULE_DETAILS = {
    mithlain: ['tjw_detail_mithlain_1', 'tjw_detail_mithlain_2', 'tjw_detail_mithlain_3', 'tjw_detail_mithlain_4', 'tjw_detail_mithlain_5'],
    mutaqaribain: ['tjw_detail_mutaqaribain_1', 'tjw_detail_mutaqaribain_2', 'tjw_detail_mutaqaribain_3', 'tjw_detail_mutaqaribain_4', 'tjw_detail_mutaqaribain_5'],
    mutajanisain: ['tjw_detail_mutajanisain_1', 'tjw_detail_mutajanisain_2', 'tjw_detail_mutajanisain_3', 'tjw_detail_mutajanisain_4', 'tjw_detail_mutajanisain_5'],
    madd_tabii: ['tjw_detail_madd_tabii_1', 'tjw_detail_madd_tabii_2', 'tjw_detail_madd_tabii_3'],
    madd_wajib_muttasil: ['tjw_detail_madd_wajib_muttasil_1', 'tjw_detail_madd_wajib_muttasil_2'],
    madd_jaiz_munfasil: ['tjw_detail_madd_jaiz_munfasil_1', 'tjw_detail_madd_jaiz_munfasil_2', 'tjw_detail_madd_jaiz_munfasil_3', 'tjw_detail_madd_jaiz_munfasil_4'],
    madd_arid_sukun: ['tjw_detail_madd_arid_sukun_1', 'tjw_detail_madd_arid_sukun_2'],
    madd_leen: ['tjw_detail_madd_leen_1', 'tjw_detail_madd_leen_2'],
    madd_badal: ['tjw_detail_madd_badal_1', 'tjw_detail_madd_badal_2', 'tjw_detail_madd_badal_3', 'tjw_detail_madd_badal_4'],
    madd_lazim: ['tjw_detail_madd_lazim_1', 'tjw_detail_madd_lazim_2', 'tjw_detail_madd_lazim_3'],
    lazim_kalami_muthaqqal: ['tjw_detail_lazim_kalami_muthaqqal_1', 'tjw_detail_lazim_kalami_muthaqqal_2'],
    lazim_kalami_mukhaffaf: ['tjw_detail_lazim_kalami_mukhaffaf_1', 'tjw_detail_lazim_kalami_mukhaffaf_2'],
    lazim_harfi_muthaqqal: ['tjw_detail_lazim_harfi_muthaqqal_1', 'tjw_detail_lazim_harfi_muthaqqal_2'],
    lazim_harfi_mukhaffaf: ['tjw_detail_lazim_harfi_mukhaffaf_1', 'tjw_detail_lazim_harfi_mukhaffaf_2', 'tjw_detail_lazim_harfi_mukhaffaf_3'],
};

export function getRuleDetailKeys(ruleId) {
    return TAJWEED_RULE_DETAILS[ruleId] || [];
}
